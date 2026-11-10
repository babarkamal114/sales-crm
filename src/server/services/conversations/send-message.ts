import 'server-only';

import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { canSend } from '@/domain/conversations/can-send';
import { previewText } from '@/domain/conversations/preview-text';
import { smsSegments } from '@/domain/conversations/sms-segments';
import type { SendMessageInput } from '@/domain/conversations/send-message-schema';
import { writeAudit } from '@/server/audit/write';
import {
  contact,
  contactConsent,
  conversation,
  message,
} from '@/server/db/schema';
import { enqueueOutbox } from '@/server/outbox/enqueue';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { requireConversationView } from '@/server/services/conversations/conversation-access';
import { loadOrgSendingSettings } from '@/server/services/conversations/load-org-sending-settings';
import {
  assertManagedOutboundAllowed,
  ManagedSendBlockedError,
} from '@/server/services/channels/usage-billing';
import { touchContactActivity } from '@/server/services/contacts/contact-access';

export type SendMessageResult = {
  messageId: string;
  conversationId: string;
  contactId: string;
  status: 'queued' | 'scheduled';
  preview: string;
  outboxEventId: string;
};

export class SendBlockedError extends Error {
  readonly code = 'SEND_BLOCKED' as const;

  constructor(readonly reason: string) {
    super(reason);
    this.name = 'SendBlockedError';
  }
}

export async function sendMessage(
  tx: DbTransaction,
  session: TenantSession,
  input: SendMessageInput,
): Promise<SendMessageResult> {
  const conv = await requireConversationView(tx, session, input.conversationId);

  const existing = await tx
    .select({ id: message.id, status: message.status, preview: message.preview })
    .from(message)
    .where(and(eq(message.orgId, session.orgId), eq(message.clientId, input.clientId)))
    .limit(1);

  if (existing[0]) {
    return {
      messageId: existing[0].id,
      conversationId: conv.id,
      contactId: conv.contactId,
      status: existing[0].status === 'scheduled' ? 'scheduled' : 'queued',
      preview: existing[0].preview ?? '',
      outboxEventId: '',
    };
  }

  const [contactRow] = await tx
    .select({
      email: contact.email,
      phoneE164: contact.phoneE164,
      recipientType: contact.recipientType,
      restricted: contact.restricted,
    })
    .from(contact)
    .where(and(eq(contact.orgId, session.orgId), eq(contact.id, conv.contactId)))
    .limit(1);

  if (!contactRow) {
    throw new Error('Contact missing for conversation');
  }

  const consentRows = await tx
    .select({
      channel: contactConsent.channel,
      dnd: contactConsent.dnd,
      marketingConsent: contactConsent.marketingConsent,
    })
    .from(contactConsent)
    .where(
      and(eq(contactConsent.orgId, session.orgId), eq(contactConsent.contactId, conv.contactId)),
    );

  const orgSettings = await loadOrgSendingSettings(tx, session.orgId, session.userId);
  const now = new Date();
  const decision = canSend({
    channel: input.channel,
    purpose: input.purpose,
    contact: {
      email: contactRow.email,
      phoneE164: contactRow.phoneE164,
      recipientType: contactRow.recipientType as 'individual' | 'corporate',
      restricted: contactRow.restricted,
    },
    consent: consentRows.map((r) => ({
      channel: r.channel,
      dnd: r.dnd,
      marketingConsent: r.marketingConsent as 'granted' | 'denied' | 'unknown',
    })),
    conversation: {
      lastInboundWhatsAppAt: conv.waWindowExpiresAt
        ? new Date(conv.waWindowExpiresAt.getTime() - 24 * 60 * 60 * 1000)
        : null,
      waWindowExpiresAt: conv.waWindowExpiresAt,
    },
    now,
    orgSettings,
  });

  if (!decision.allowed || decision.mode === 'blocked' || decision.mode === 'template_only') {
    throw new SendBlockedError(decision.reason || 'Sending is not allowed.');
  }

  if (input.channel === 'sms' || input.channel === 'whatsapp') {
    try {
      await assertManagedOutboundAllowed(
        tx,
        session.orgId,
        input.channel,
        input.channel === 'sms' ? contactRow.phoneE164 : contactRow.phoneE164,
      );
    } catch (e) {
      if (e instanceof ManagedSendBlockedError) {
        throw new SendBlockedError(e.message);
      }
      throw e;
    }
  }

  const scheduled = input.scheduledAt && input.scheduledAt.getTime() > now.getTime();
  const status = scheduled ? 'scheduled' : 'queued';
  const preview = previewText({
    bodyText: input.bodyText,
    ...(input.bodyHtml !== undefined ? { bodyHtml: input.bodyHtml } : {}),
  });
  const segments = input.channel === 'sms' ? smsSegments(input.bodyText).segments : null;

  const [inserted] = await tx
    .insert(message)
    .values({
      orgId: session.orgId,
      conversationId: conv.id,
      contactId: conv.contactId,
      channel: input.channel,
      direction: 'outbound',
      purpose: input.purpose,
      subject: input.subject ?? null,
      bodyText: input.bodyText,
      bodyHtml: input.bodyHtml ?? null,
      preview,
      toAddress: input.channel === 'email' ? contactRow.email : contactRow.phoneE164,
      status,
      sentByUserId: session.userId,
      clientId: input.clientId,
      scheduledAt: scheduled ? input.scheduledAt! : null,
      segments,
      ...(input.templateId ? { templateId: input.templateId } : {}),
    })
    .returning({ id: message.id });

  if (!inserted) throw new Error('Message insert failed');

  const convUpdate: Partial<typeof conversation.$inferInsert> = {
    lastMessageAt: now,
    lastOutboundAt: now,
    lastChannel: input.channel,
    waitingSince: null,
    updatedAt: now,
    updatedBy: session.userId,
    version: conv.version + 1,
  };
  if (conv.status === 'closed' || conv.status === 'snoozed') {
    convUpdate.status = 'open';
    convUpdate.snoozedUntil = null;
  }

  await tx
    .update(conversation)
    .set(convUpdate)
    .where(and(eq(conversation.orgId, session.orgId), eq(conversation.id, conv.id)));

  await touchContactActivity(tx, session, conv.contactId, now);

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'conversation.message_queued',
    entityType: 'message',
    entityId: inserted.id,
    metadata: { channel: input.channel, conversationId: conv.id },
  });

  let outboxEventId = '';
  if (!scheduled) {
    outboxEventId = await enqueueOutbox(tx, {
      orgId: session.orgId,
      type: 'crm/message.send',
      payload: {
        orgId: session.orgId,
        messageId: inserted.id,
        requestId: randomUUID(),
      },
    });
  }

  return {
    messageId: inserted.id,
    conversationId: conv.id,
    contactId: conv.contactId,
    status,
    preview,
    outboxEventId,
  };
}
