import 'server-only';

import { isRetryableCode, mapProviderError } from '@/channels/errors';
import { ChannelNotConfiguredError, getChannel, getMailbox } from '@/channels/registry';
import { createFakeMessagingProvider } from '@/server/integrations/messaging/fake-provider';
import type {
  MessagingProvider,
  OutboundMessagePayload,
  ProviderSendResult,
} from '@/server/integrations/messaging/types';
import {
  sendGoogleMailForOrg,
  sendGoogleMailForPersonalMailbox,
} from '@/server/integrations/google-mail-send';
import { and, eq } from 'drizzle-orm';
import { mailboxConnection } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';

export async function getMessagingProviderForMessage(
  tx: DbTransaction,
  payload: OutboundMessagePayload & { sentByUserId?: string | null },
): Promise<MessagingProvider> {
  if (payload.channel === 'email') {
    return {
      async send(message): Promise<ProviderSendResult> {
        const userId = payload.sentByUserId;
        if (userId && process.env.CHANNELS_USE_FAKE === '1') {
          const [mb] = await tx
            .select({ id: mailboxConnection.id })
            .from(mailboxConnection)
            .where(
              and(
                eq(mailboxConnection.orgId, message.orgId),
                eq(mailboxConnection.userId, userId),
                eq(mailboxConnection.kind, 'personal'),
              ),
            )
            .limit(1);
          if (mb) {
            const mailbox = await getMailbox(tx, message.orgId, mb.id);
            const sent = await mailbox.send({
              to: [message.to],
              subject: message.subject ?? '',
              bodyText: message.bodyText,
              ...(message.bodyHtml ? { bodyHtml: message.bodyHtml } : {}),
            });
            return {
              ok: true,
              providerMessageId: sent.providerMessageId,
              provider: 'mailbox',
            };
          }
        }
        const html = message.bodyHtml ?? message.bodyText.replace(/\n/g, '<br>');
        const mailInput = {
          to: message.to,
          subject: message.subject ?? '(no subject)',
          html,
        };

        if (userId) {
          const personal = await sendGoogleMailForPersonalMailbox(
            tx,
            message.orgId,
            userId,
            mailInput,
          );
          if (personal.ok) {
            return {
              ok: true,
              providerMessageId: personal.providerMessageId ?? message.messageId,
              provider: 'mailbox',
            };
          }
          if (
            personal.reason !== 'no_mailbox' &&
            personal.reason !== 'google_not_connected'
          ) {
            const mapped = mapProviderError(
              personal.reason === 'microsoft_send_not_available' ? 'microsoft' : 'google',
              personal.reason,
              personal.detail ?? personal.reason,
            );
            return {
              ok: false,
              retryable: mapped.retryable,
              errorCode: mapped.code,
              errorMessage: mapped.message,
            };
          }
        }

        const result = await sendGoogleMailForOrg(tx, message.orgId, mailInput);
        if (result.ok) {
          return {
            ok: true,
            providerMessageId: result.providerMessageId ?? message.messageId,
            provider: 'google_mail',
          };
        }
        const mapped = mapProviderError(
          'google',
          result.reason,
          result.detail ?? result.reason,
        );
        return {
          ok: false,
          retryable: mapped.retryable,
          errorCode: mapped.code,
          errorMessage: mapped.message,
        };
      },
    };
  }

  const channel = payload.channel === 'whatsapp' ? 'whatsapp' : 'sms';

  try {
    const bundle = await getChannel(tx, payload.orgId, channel);
    if (channel === 'whatsapp') {
      const wa = bundle.whatsapp;
      if (!wa) {
        const useFake =
          process.env.CHANNELS_USE_FAKE === '1' || process.env.NODE_ENV === 'test';
        if (useFake) return createFakeMessagingProvider();
        return {
          async send(): Promise<ProviderSendResult> {
            return {
              ok: false,
              retryable: false,
              errorCode: 'NOT_CONFIGURED',
              errorMessage: 'WhatsApp is not configured for this organisation.',
            };
          },
        };
      }
      return {
        async send(message): Promise<ProviderSendResult> {
          const result = await wa.sendText({ to: message.to, body: message.bodyText });
          if (result.ok) {
            return {
              ok: true,
              providerMessageId: result.providerMessageId,
              provider: bundle.provider,
            };
          }
          return {
            ok: false,
            retryable: isRetryableCode(result.code),
            errorCode: result.code,
            errorMessage: result.message,
          };
        },
      };
    }

    const sms = bundle.sms;
    if (!sms) {
      const useFake =
        process.env.CHANNELS_USE_FAKE === '1' || process.env.NODE_ENV === 'test';
      if (useFake) return createFakeMessagingProvider();
      return {
        async send(): Promise<ProviderSendResult> {
          return {
            ok: false,
            retryable: false,
            errorCode: 'NOT_CONFIGURED',
            errorMessage: 'SMS is not configured for this organisation.',
          };
        },
      };
    }

    return {
      async send(message): Promise<ProviderSendResult> {
        const from = '+447700900000';
        const result = await sms.send({
          from,
          to: message.to,
          body: message.bodyText,
        });
        if (result.ok) {
          return {
            ok: true,
            providerMessageId: result.providerMessageId,
            provider: bundle.provider,
          };
        }
        return {
          ok: false,
          retryable: isRetryableCode(result.code),
          errorCode: result.code,
          errorMessage: result.message,
        };
      },
    };
  } catch (err) {
    const useFake =
      process.env.CHANNELS_USE_FAKE === '1' || process.env.NODE_ENV === 'test';
    if (useFake) return createFakeMessagingProvider();

    const message =
      err instanceof ChannelNotConfiguredError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Channel not configured';
    const code =
      err instanceof ChannelNotConfiguredError ? 'NOT_CONFIGURED' : 'PROVIDER_ERROR';

    return {
      async send(): Promise<ProviderSendResult> {
        return {
          ok: false,
          retryable: false,
          errorCode: code,
          errorMessage: message,
        };
      },
    };
  }
}

/** @deprecated Use getMessagingProviderForMessage inside a transaction. */
export function getMessagingProvider(_orgId: string): MessagingProvider {
  return createFakeMessagingProvider();
}
