import 'server-only';

import { getAppUrl } from '@/server/env';
import type { DbTransaction } from '@/server/db/with-tenant';
import { sendCrmEmail } from '@/server/email/send-crm-email';

export async function sendTeamInviteEmail(
  tx: DbTransaction,
  orgId: string,
  input: {
    to: string;
    orgName: string;
    inviteUrl: string;
    inviterName: string;
  },
): Promise<{ sent: boolean; reason?: string }> {
  const result = await sendCrmEmail(tx, orgId, {
    to: input.to,
    subject: `Join ${input.orgName} on CRM`,
    html: `<p>${input.inviterName} invited you to join <strong>${input.orgName}</strong> on CRM.</p><p><a href="${input.inviteUrl}">Accept invitation</a></p><p>This link expires in 14 days.</p>`,
  });

  if (!result.ok) {
    if (result.reason === 'google_not_connected' || result.reason === 'google_token_invalid') {
      return { sent: false, reason: 'email_not_configured' };
    }
    return { sent: false, reason: 'send_failed' };
  }

  return { sent: true };
}

export function buildInviteAcceptUrl(token: string): string {
  return `${getAppUrl()}/accept-invite?token=${encodeURIComponent(token)}`;
}
