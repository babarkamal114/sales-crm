import 'server-only';

import { and, eq } from 'drizzle-orm';
import { messageSendEventSchema } from '@/server/jobs/events';
import { getMessagingProviderForMessage } from '@/server/integrations/messaging/select-provider';
import { channelConnection, message, messageStatusEvent } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';
import { withTenantSystem } from '@/server/db/with-tenant';
import {
  assertManagedOutboundAllowed,
  recordChannelUsage,
} from '@/server/services/channels/usage-billing';

export class MessageSendRetryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MessageSendRetryError';
  }
}

export class MessageSendPermanentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MessageSendPermanentError';
  }
}

/** Processes `crm/message.send` outbox events (Inngest target; callable after commit). */
export async function runSendOutboundMessage(raw: unknown): Promise<{ outcome: string }> {
  const data = messageSendEventSchema.parse(raw);

  return withTenantSystem(data.orgId, async (tx) => {
    const [row] = await tx
      .select()
      .from(message)
      .where(and(eq(message.orgId, data.orgId), eq(message.id, data.messageId)))
      .limit(1);

    if (!row) return { outcome: 'missing' };
    if (row.status !== 'queued' && row.status !== 'sending') {
      return { outcome: 'skipped' };
    }

    await tx
      .update(message)
      .set({ status: 'sending', updatedAt: new Date() })
      .where(eq(message.id, row.id));

    const to = row.toAddress?.trim();
    if (!to) {
      await markFailed(tx, data.orgId, row.id, 'NO_ADDRESS', 'No recipient address on message.');
      return { outcome: 'failed' };
    }

    if (row.channel === 'sms' || row.channel === 'whatsapp') {
      try {
        await assertManagedOutboundAllowed(tx, data.orgId, row.channel, to);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Managed send blocked';
        await markFailed(tx, data.orgId, row.id, 'SPEND_LIMIT', msg);
        return { outcome: 'failed' };
      }
    }

    const provider = await getMessagingProviderForMessage(tx, {
      orgId: data.orgId,
      messageId: row.id,
      channel: row.channel,
      to,
      subject: row.subject,
      bodyText: row.bodyText ?? '',
      bodyHtml: row.bodyHtml,
      sentByUserId: row.sentByUserId,
    });

    const result = await provider.send({
      orgId: data.orgId,
      messageId: row.id,
      channel: row.channel,
      to,
      subject: row.subject,
      bodyText: row.bodyText ?? '',
      bodyHtml: row.bodyHtml,
    });

    if (!result.ok) {
      if (result.retryable) {
        await tx
          .update(message)
          .set({ status: 'queued', updatedAt: new Date() })
          .where(eq(message.id, row.id));
        throw new MessageSendRetryError(result.errorMessage);
      }
      await markFailed(tx, data.orgId, row.id, result.errorCode ?? 'FAILED', result.errorMessage);
      return { outcome: 'failed' };
    }

    const now = new Date();
    await tx
      .update(message)
      .set({
        status: 'sent',
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        updatedAt: now,
      })
      .where(eq(message.id, row.id));

    await tx.insert(messageStatusEvent).values({
      orgId: data.orgId,
      messageId: row.id,
      status: 'sent',
      occurredAt: now,
    });

    if (
      (row.channel === 'sms' || row.channel === 'whatsapp') &&
      result.providerMessageId
    ) {
      const [conn] = await tx
        .select({ id: channelConnection.id, mode: channelConnection.mode })
        .from(channelConnection)
        .where(
          and(
            eq(channelConnection.orgId, data.orgId),
            eq(channelConnection.channel, row.channel),
            eq(channelConnection.isDefault, true),
          ),
        )
        .limit(1);

      if (conn?.mode === 'managed') {
        await recordChannelUsage(tx, {
          orgId: data.orgId,
          connectionId: conn.id,
          channel: row.channel,
          unit: row.channel === 'sms' ? 'segment' : 'message',
          quantity: row.channel === 'sms' ? Math.max(1, row.segments ?? 1) : 1,
          providerReference: `msg:${row.channel}:${result.providerMessageId}`,
          direction: 'outbound',
          occurredAt: now,
        });
      }
    }

    return { outcome: 'sent' };
  });
}

async function markFailed(
  tx: DbTransaction,
  orgId: string,
  messageId: string,
  errorCode: string,
  errorMessage: string,
) {
  const now = new Date();
  await tx
    .update(message)
    .set({
      status: 'failed',
      errorCode,
      errorMessage,
      updatedAt: now,
    })
    .where(eq(message.id, messageId));

  await tx.insert(messageStatusEvent).values({
    orgId,
    messageId,
    status: 'failed',
    occurredAt: now,
  });
}
