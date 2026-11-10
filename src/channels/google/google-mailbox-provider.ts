import 'server-only';

import type { MailboxProvider } from '@/channels/interfaces';
import type {
  MailboxChangeHint,
  MailboxTokens,
  OutboundEmail,
  PushState,
  RawWebhook,
  SyncState,
  SyncedEmail,
  TestResult,
} from '@/channels/types';
import type { DbTransaction } from '@/server/db/with-tenant';
import { sendGoogleMailForPersonalMailbox } from '@/server/integrations/google-mail-send';
import {
  gmailApiFetch,
  resolveGoogleMailboxAccessToken,
} from '@/server/integrations/google-mailbox-client';

export function createGoogleMailboxProvider(input: {
  tx: DbTransaction;
  orgId: string;
  userId: string;
  mailboxId: string;
  emailAddress: string;
  accessTokenCiphertext: string | null;
  refreshTokenCiphertext: string | null;
  tokenExpiresAt: Date | null;
}): MailboxProvider {
  const tokenRow = {
    accessTokenCiphertext: input.accessTokenCiphertext,
    refreshTokenCiphertext: input.refreshTokenCiphertext,
    tokenExpiresAt: input.tokenExpiresAt,
  };

  return {
    async refresh(tokens: MailboxTokens): Promise<MailboxTokens> {
      void tokens;
      return tokens;
    },

    async send(msg: OutboundEmail): Promise<{ providerMessageId: string; providerThreadId: string }> {
      const to = msg.to[0];
      if (!to) throw new Error('Recipient required');

      const result = await sendGoogleMailForPersonalMailbox(input.tx, input.orgId, input.userId, {
        to,
        subject: msg.subject,
        html: msg.bodyHtml ?? (msg.bodyText ?? '').replace(/\n/g, '<br>'),
      });

      if (!result.ok) {
        throw new Error(result.detail ?? result.reason);
      }

      return {
        providerMessageId: result.providerMessageId ?? '',
        providerThreadId: '',
      };
    },

    async startPush(): Promise<PushState> {
      return { kind: 'gmail', historyId: null, expiresAt: null };
    },

    async renewPush(state: PushState): Promise<PushState> {
      return state;
    },

    parsePush(_raw: RawWebhook): MailboxChangeHint {
      return { mailboxId: input.mailboxId, reason: 'poll' };
    },

    async syncChanges(_state: SyncState): Promise<{ messages: SyncedEmail[]; next: SyncState }> {
      return { messages: [], next: _state };
    },

    backfill() {
      return (async function* (): AsyncGenerator<SyncedEmail> {
        // Contact-scoped backfill runs via `crm/mailbox.contact_backfill` job.
      })();
    },

    async revoke(): Promise<void> {},

    async testConnection(): Promise<TestResult> {
      const accessToken = await resolveGoogleMailboxAccessToken(
        input.tx,
        input.mailboxId,
        input.userId,
        tokenRow,
      );
      if (!accessToken) {
        return { ok: false, code: 'auth_failed', message: 'Could not refresh mailbox token.' };
      }

      const res = await gmailApiFetch(accessToken, '/profile');
      if (!res.ok) {
        return {
          ok: false,
          code: 'provider_unavailable',
          message: `Gmail API returned ${res.status}`,
        };
      }

      return { ok: true, detail: `Connected as ${input.emailAddress}` };
    },
  };
}
