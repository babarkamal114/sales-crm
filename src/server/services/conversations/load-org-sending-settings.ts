import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';
import type { SendingSettings } from '@/domain/conversations/types';
import {
  channelConnection,
  integrationConnection,
  mailboxConnection,
  organisationSettings,
} from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';
import { ensurePersonalMailboxFromLegacyGoogle } from '@/server/services/channels/sync-mailbox-from-legacy-integration';
import { getSpendSummary } from '@/server/services/channels/usage-billing';

export async function loadOrgSendingSettings(
  tx: DbTransaction,
  orgId: string,
  userId: string,
): Promise<SendingSettings> {
  const [settings] = await tx
    .select({ timeZone: organisationSettings.timeZone })
    .from(organisationSettings)
    .where(eq(organisationSettings.orgId, orgId))
    .limit(1);

  let [mailbox] = await tx
    .select({ status: mailboxConnection.status })
    .from(mailboxConnection)
    .where(
      and(
        eq(mailboxConnection.orgId, orgId),
        eq(mailboxConnection.userId, userId),
        eq(mailboxConnection.kind, 'personal'),
      ),
    )
    .limit(1);

  if (!mailbox) {
    await ensurePersonalMailboxFromLegacyGoogle(tx, orgId, userId);
    [mailbox] = await tx
      .select({ status: mailboxConnection.status })
      .from(mailboxConnection)
      .where(
        and(
          eq(mailboxConnection.orgId, orgId),
          eq(mailboxConnection.userId, userId),
          eq(mailboxConnection.kind, 'personal'),
        ),
      )
      .limit(1);
  }

  const mailboxActive =
    mailbox?.status === 'active' || mailbox?.status === 'syncing_initial';

  const channelRows = await tx
    .select({ channel: channelConnection.channel, status: channelConnection.status })
    .from(channelConnection)
    .where(
      and(
        eq(channelConnection.orgId, orgId),
        eq(channelConnection.isDefault, true),
        inArray(channelConnection.status, ['active', 'degraded']),
      ),
    );

  let smsConnected = channelRows.some((r) => r.channel === 'sms' && r.status === 'active');
  let whatsappConnected = channelRows.some(
    (r) => r.channel === 'whatsapp' && r.status === 'active',
  );

  if (!smsConnected || !whatsappConnected) {
    const legacy = await tx
      .select({ capability: integrationConnection.capability, status: integrationConnection.status })
      .from(integrationConnection)
      .where(
        and(
          eq(integrationConnection.orgId, orgId),
          eq(integrationConnection.status, 'connected'),
        ),
      );

    if (!smsConnected) {
      smsConnected = legacy.some((c) => c.capability === 'telephony');
    }
    if (!whatsappConnected) {
      whatsappConnected = legacy.some((c) => c.capability === 'telephony');
    }
  }

  const spend = await getSpendSummary(tx, orgId);

  return {
    timeZone: settings?.timeZone ?? 'Europe/London',
    emailDomainVerified: mailboxActive,
    smsConnected,
    whatsappConnected,
    managedSpendPaused: spend.paused,
    managedSpendAlert: spend.alertTriggered && !spend.paused,
  };
}
