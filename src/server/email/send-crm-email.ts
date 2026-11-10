import 'server-only';

import type { DbTransaction } from '@/server/db/with-tenant';
import { sendGoogleMailForOrg } from '@/server/integrations/google-mail-send';

export type SendCrmEmailInput = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

export type SendCrmEmailResult =
  | { ok: true; providerMessageId: string | null }
  | {
      ok: false;
      reason:
        | 'email_not_configured'
        | 'send_failed'
        | 'invalid_recipient'
        | 'google_not_connected'
        | 'google_token_invalid';
      detail?: string;
    };

/** Sends from the organisation's connected Google Mail (Gmail) account. */
export async function sendCrmEmail(
  tx: DbTransaction,
  orgId: string,
  input: SendCrmEmailInput,
): Promise<SendCrmEmailResult> {
  const result = await sendGoogleMailForOrg(tx, orgId, {
    to: input.to,
    subject: input.subject,
    html: input.html,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
  });

  if (result.ok) {
    return { ok: true, providerMessageId: result.providerMessageId };
  }

  if (result.reason === 'google_not_connected' || result.reason === 'google_token_invalid') {
    return {
      ok: false,
      reason: result.reason === 'google_not_connected' ? 'google_not_connected' : 'google_token_invalid',
    };
  }

  if (result.reason === 'invalid_recipient') {
    return { ok: false, reason: 'invalid_recipient' };
  }

  return result.detail
    ? { ok: false, reason: 'send_failed', detail: result.detail }
    : { ok: false, reason: 'send_failed' };
}
