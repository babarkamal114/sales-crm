import 'server-only';

import { and, desc, eq } from 'drizzle-orm';
import { isManagedWhatsAppEnabled } from '@/domain/channels/feature-flags';
import { getSpendSummary } from '@/server/services/channels/usage-billing';
import type { ChannelOverviewCard, ChannelsOverview } from '@/domain/channels/overview';
import { assertCan } from '@/server/access/capabilities';
import {
  channelConnection,
  mailboxConnection,
  mailboxSyncState,
  phoneNumber,
  whatsappSender,
  regulatoryProfile,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

function cardStateFromConnection(status: string | undefined): ChannelOverviewCard['state'] {
  if (!status || status === 'draft') return 'not_set_up';
  if (status === 'pending' || status === 'verifying') return 'in_progress';
  if (status === 'suspended') return 'suspended';
  if (status === 'degraded' || status === 'failed') return 'needs_attention';
  if (status === 'active') return 'active';
  return 'not_set_up';
}

export async function getChannelsOverview(
  tx: DbTransaction,
  session: TenantSession,
): Promise<ChannelsOverview> {
  assertCan(session, 'contact.view');

  const readOnly = session.role !== 'admin';

  const [myMailbox] = await tx
    .select({
      id: mailboxConnection.id,
      email: mailboxConnection.emailAddress,
      status: mailboxConnection.status,
      statusReason: mailboxConnection.statusReason,
      lastSyncedAt: mailboxConnection.lastSyncedAt,
      provider: mailboxConnection.provider,
      sentToday: mailboxConnection.sentToday,
      dailySendLimit: mailboxConnection.dailySendLimit,
    })
    .from(mailboxConnection)
    .where(and(eq(mailboxConnection.orgId, session.orgId), eq(mailboxConnection.userId, session.userId)))
    .orderBy(desc(mailboxConnection.updatedAt))
    .limit(1);

  let mySync: { backfillStatus: string | null } | undefined;
  if (myMailbox) {
    [mySync] = await tx
      .select({ backfillStatus: mailboxSyncState.backfillStatus })
      .from(mailboxSyncState)
      .where(eq(mailboxSyncState.mailboxId, myMailbox.id))
      .limit(1);
  }

  const smsConn = await tx
    .select()
    .from(channelConnection)
    .where(and(eq(channelConnection.orgId, session.orgId), eq(channelConnection.channel, 'sms')))
    .orderBy(desc(channelConnection.isDefault), desc(channelConnection.updatedAt))
    .limit(1);

  const waConn = await tx
    .select()
    .from(channelConnection)
    .where(and(eq(channelConnection.orgId, session.orgId), eq(channelConnection.channel, 'whatsapp')))
    .limit(1);

  const [reg] = await tx
    .select({ status: regulatoryProfile.status, rejectionReason: regulatoryProfile.rejectionReason })
    .from(regulatoryProfile)
    .where(eq(regulatoryProfile.orgId, session.orgId))
    .limit(1);

  const [defaultNumber] = await tx
    .select({ e164: phoneNumber.e164, capabilities: phoneNumber.capabilities })
    .from(phoneNumber)
    .where(and(eq(phoneNumber.orgId, session.orgId), eq(phoneNumber.isDefaultForSms, true)))
    .limit(1);

  const spend = await getSpendSummary(tx, session.orgId);

  let emailState: ChannelOverviewCard['state'] = myMailbox
    ? cardStateFromConnection(myMailbox.status)
    : 'not_set_up';
  if (myMailbox?.status === 'reconnect_required') emailState = 'needs_attention';

  const emailCard: ChannelOverviewCard = {
    id: 'email',
    title: 'Email',
    state: emailState,
    mode: 'mailbox',
    providerLabel: myMailbox?.provider ?? null,
    identity: myMailbox?.email ?? null,
    statusReason: myMailbox?.statusReason ?? null,
    lastCheckedAt: myMailbox?.lastSyncedAt?.toISOString() ?? null,
    nextAction: !myMailbox
      ? 'Connect your mailbox (Google, Microsoft, or other IMAP)'
      : myMailbox.status === 'reconnect_required'
        ? 'Reconnect mailbox'
        : mySync?.backfillStatus === 'running' || mySync?.backfillStatus === 'pending'
          ? 'Syncing recent email with your contacts…'
          : null,
    readOnly,
  };

  if (myMailbox && emailCard.state === 'active') {
    emailCard.identity = `${myMailbox.email} · ${myMailbox.sentToday}/${myMailbox.dailySendLimit} sent today`;
  }

  const smsRow = smsConn[0];
  let phoneState: ChannelOverviewCard['state'] = smsRow
    ? cardStateFromConnection(smsRow.status)
    : 'not_set_up';
  if (reg?.status === 'in_review' || reg?.status === 'submitted') phoneState = 'in_progress';
  if (reg?.status === 'rejected') phoneState = 'needs_attention';

  const phoneCard: ChannelOverviewCard = {
    id: 'phone_sms',
    title: 'Phone & SMS',
    state: phoneState,
    mode: smsRow?.mode ?? 'managed',
    providerLabel: smsRow?.provider ?? 'twilio',
    identity: defaultNumber?.e164 ?? null,
    statusReason: reg?.rejectionReason ?? smsRow?.statusReason ?? null,
    lastCheckedAt: smsRow?.lastCheckedAt?.toISOString() ?? null,
    nextAction:
      reg?.status === 'rejected'
        ? 'Fix business details and resubmit'
        : !smsRow
          ? 'Complete business details and get a number'
          : !defaultNumber
            ? 'Purchase or assign a phone number'
            : null,
    readOnly,
  };

  const waRow = waConn[0];
  const waEnabled = isManagedWhatsAppEnabled();
  let waSender: {
    displayName: string | null;
    phoneNumberId: string;
    qualityRating: string | null;
    messagingLimitTier: string | null;
  } | null = null;

  if (waRow) {
    const [sender] = await tx
      .select({
        displayName: whatsappSender.displayName,
        phoneNumberId: whatsappSender.phoneNumberId,
        qualityRating: whatsappSender.qualityRating,
        messagingLimitTier: whatsappSender.messagingLimitTier,
      })
      .from(whatsappSender)
      .where(
        and(eq(whatsappSender.orgId, session.orgId), eq(whatsappSender.connectionId, waRow.id)),
      )
      .limit(1);
    waSender = sender ?? null;
  }

  let waState: ChannelOverviewCard['state'] = waRow
    ? cardStateFromConnection(waRow.status)
    : 'not_set_up';
  if (waSender?.qualityRating === 'RED') waState = 'needs_attention';

  const whatsappCard: ChannelOverviewCard = {
    id: 'whatsapp',
    title: 'WhatsApp',
    state: waState,
    mode: waRow?.mode ?? 'managed',
    providerLabel: waRow?.provider ?? null,
    identity: waSender
      ? `${waSender.displayName ?? 'WhatsApp sender'} · limit ${waSender.messagingLimitTier ?? '—'}`
      : null,
    statusReason:
      waSender?.qualityRating === 'RED' || waSender?.qualityRating === 'YELLOW'
        ? `Quality rating: ${waSender.qualityRating}`
        : waRow?.statusReason ?? null,
    lastCheckedAt: waRow?.lastCheckedAt?.toISOString() ?? null,
    nextAction: !waRow
      ? waEnabled
        ? 'Connect WhatsApp Business (managed or BYO)'
        : 'Coming soon — enable managed WhatsApp for your workspace'
      : waRow.status === 'pending'
        ? 'Finish Embedded Signup or BYO connection'
        : null,
    readOnly,
  };

  const usageCard: ChannelOverviewCard = {
    id: 'usage',
    title: 'Usage & limits',
    state: spend.paused ? 'needs_attention' : 'active',
    mode: null,
    providerLabel: null,
    identity: `${spend.percentUsed}% used · £${(spend.spentPence / 100).toFixed(0)} / £${(spend.monthlyLimitPence / 100).toFixed(0)}`,
    statusReason: spend.paused
      ? 'Managed sending paused at spend limit'
      : spend.alertTriggered
        ? `Over ${spend.alertAtPercent}% of monthly limit`
        : null,
    lastCheckedAt: null,
    nextAction: spend.paused ? 'Raise limit or wait until next month' : null,
    readOnly,
  };

  return { cards: [emailCard, phoneCard, whatsappCard, usageCard] };
}
