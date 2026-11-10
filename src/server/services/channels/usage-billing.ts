import 'server-only';

import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import {
  DEFAULT_MONTHLY_SPEND_LIMIT_PENCE,
  defaultUnitPricePence,
} from '@/domain/channels/pricing';
import type { ChannelKind } from '@/channels/types';
import {
  channelConnection,
  message,
  organisation,
  spendLimit,
  usageRecord,
} from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';

const NEW_ORG_DAYS = 14;
const NEW_ORG_SMS_DAILY_CAP = 50;

import type { SpendSummary, UsageByChannel } from '@/domain/channels/usage-types';
import { isUkE164 } from '@/domain/channels/uk-sms';

export type { SpendSummary, UsageByChannel } from '@/domain/channels/usage-types';

function monthStartUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

export async function ensureOrgSpendLimit(
  tx: DbTransaction,
  orgId: string,
): Promise<typeof spendLimit.$inferSelect> {
  const [row] = await tx.select().from(spendLimit).where(eq(spendLimit.orgId, orgId)).limit(1);
  if (row) return row;

  const [created] = await tx
    .insert(spendLimit)
    .values({
      orgId,
      monthlyLimitPence: DEFAULT_MONTHLY_SPEND_LIMIT_PENCE,
    })
    .returning();

  return created!;
}

export async function getMonthlySpendPence(tx: DbTransaction, orgId: string): Promise<number> {
  const from = monthStartUtc();
  const [agg] = await tx
    .select({
      total: sql<number>`coalesce(sum(${usageRecord.pricePence}), 0)::int`,
    })
    .from(usageRecord)
    .where(and(eq(usageRecord.orgId, orgId), gte(usageRecord.occurredAt, from)));

  return Number(agg?.total ?? 0);
}

export async function getSpendSummary(tx: DbTransaction, orgId: string): Promise<SpendSummary> {
  const limits = await ensureOrgSpendLimit(tx, orgId);
  const spentPence = await getMonthlySpendPence(tx, orgId);
  const monthlyLimitPence = Number(limits.monthlyLimitPence);
  const percentUsed =
    monthlyLimitPence > 0 ? Math.min(100, Math.round((spentPence / monthlyLimitPence) * 100)) : 0;

  return {
    monthlyLimitPence,
    spentPence,
    percentUsed,
    paused: limits.pausedAt !== null,
    alertAtPercent: limits.alertAtPercent,
    alertTriggered: percentUsed >= limits.alertAtPercent,
  };
}

export async function getUsageBreakdownByChannel(
  tx: DbTransaction,
  orgId: string,
): Promise<UsageByChannel[]> {
  const from = monthStartUtc();
  const rows = await tx
    .select({
      channel: usageRecord.channel,
      spent: sql<number>`coalesce(sum(${usageRecord.pricePence}), 0)::int`,
      qty: sql<number>`coalesce(sum(${usageRecord.quantity}), 0)::int`,
    })
    .from(usageRecord)
    .where(and(eq(usageRecord.orgId, orgId), gte(usageRecord.occurredAt, from)))
    .groupBy(usageRecord.channel);

  return rows.map((r) => ({
    channel: r.channel,
    spentPence: Number(r.spent),
    quantity: Number(r.qty),
  }));
}

async function refreshSpendPauseState(tx: DbTransaction, orgId: string): Promise<void> {
  const limits = await ensureOrgSpendLimit(tx, orgId);
  const spent = await getMonthlySpendPence(tx, orgId);
  const limit = Number(limits.monthlyLimitPence);
  const threshold = Math.floor((limit * limits.pauseAtPercent) / 100);

  if (spent >= threshold && limits.pausedAt === null) {
    await tx
      .update(spendLimit)
      .set({ pausedAt: new Date(), updatedAt: new Date() })
      .where(eq(spendLimit.orgId, orgId));
    return;
  }

  if (spent < threshold && limits.pausedAt !== null) {
    await tx
      .update(spendLimit)
      .set({ pausedAt: null, updatedAt: new Date() })
      .where(eq(spendLimit.orgId, orgId));
  }
}

export async function recordChannelUsage(
  tx: DbTransaction,
  input: {
    orgId: string;
    connectionId?: string | null;
    channel: ChannelKind;
    unit: string;
    quantity: number;
    providerReference: string;
    direction?: 'outbound' | 'inbound';
    occurredAt?: Date;
    pricePence?: number;
  },
): Promise<{ recorded: boolean }> {
  const price =
    input.pricePence ??
    defaultUnitPricePence(input.channel, input.unit) * Math.max(1, input.quantity);

  const [inserted] = await tx
    .insert(usageRecord)
    .values({
      orgId: input.orgId,
      connectionId: input.connectionId ?? null,
      channel: input.channel,
      unit: input.unit,
      quantity: input.quantity,
      pricePence: price,
      costPence: Math.floor(price * 0.7),
      direction: input.direction ?? 'outbound',
      occurredAt: input.occurredAt ?? new Date(),
      providerReference: input.providerReference,
    })
    .onConflictDoNothing({ target: usageRecord.providerReference })
    .returning({ id: usageRecord.id });

  if (inserted) {
    await refreshSpendPauseState(tx, input.orgId);
  }

  return { recorded: Boolean(inserted) };
}

async function isManagedConnection(
  tx: DbTransaction,
  orgId: string,
  channel: ChannelKind,
): Promise<boolean> {
  const [row] = await tx
    .select({ mode: channelConnection.mode })
    .from(channelConnection)
    .where(
      and(
        eq(channelConnection.orgId, orgId),
        eq(channelConnection.channel, channel),
        eq(channelConnection.isDefault, true),
        eq(channelConnection.status, 'active'),
      ),
    )
    .limit(1);

  return row?.mode === 'managed';
}

export async function countOrgSmsSentToday(tx: DbTransaction, orgId: string): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  const [row] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(message)
    .where(
      and(
        eq(message.orgId, orgId),
        eq(message.channel, 'sms'),
        eq(message.direction, 'outbound'),
        gte(message.createdAt, start),
        inArray(message.status, ['queued', 'sending', 'sent', 'delivered']),
      ),
    );

  return Number(row?.count ?? 0);
}

export class ManagedSendBlockedError extends Error {
  readonly code = 'MANAGED_SEND_BLOCKED' as const;
  constructor(message: string) {
    super(message);
    this.name = 'ManagedSendBlockedError';
  }
}

/** Gates managed SMS/WhatsApp/voice outbound (not email, not BYO). */
export async function assertManagedOutboundAllowed(
  tx: DbTransaction,
  orgId: string,
  channel: 'sms' | 'whatsapp',
  toAddress: string | null | undefined,
): Promise<void> {
  const managed = await isManagedConnection(tx, orgId, channel);
  if (!managed) return;

  const summary = await getSpendSummary(tx, orgId);
  if (summary.paused) {
    throw new ManagedSendBlockedError(
      'Managed channel sending is paused — monthly spend limit reached. An Admin can raise the limit under Settings → Channels → Usage.',
    );
  }

  if (channel === 'sms') {
    if (!isUkE164(toAddress)) {
      throw new ManagedSendBlockedError(
        'Managed SMS is UK-only (+44 numbers). Use email or a BYO provider for other regions.',
      );
    }

    const [org] = await tx
      .select({ createdAt: organisation.createdAt })
      .from(organisation)
      .where(eq(organisation.id, orgId))
      .limit(1);

    if (org) {
      const ageMs = Date.now() - org.createdAt.getTime();
      const newOrg = ageMs < NEW_ORG_DAYS * 24 * 60 * 60 * 1000;
      if (newOrg) {
        const sentToday = await countOrgSmsSentToday(tx, orgId);
        if (sentToday >= NEW_ORG_SMS_DAILY_CAP) {
          throw new ManagedSendBlockedError(
            `New organisations are limited to ${NEW_ORG_SMS_DAILY_CAP} SMS per day on managed numbers.`,
          );
        }
      }
    }
  }
}

export async function updateOrgSpendLimit(
  tx: DbTransaction,
  orgId: string,
  input: { monthlyLimitPence: number; alertAtPercent?: number; pauseAtPercent?: number },
): Promise<void> {
  await ensureOrgSpendLimit(tx, orgId);
  await tx
    .update(spendLimit)
    .set({
      monthlyLimitPence: input.monthlyLimitPence,
      ...(input.alertAtPercent !== undefined ? { alertAtPercent: input.alertAtPercent } : {}),
      ...(input.pauseAtPercent !== undefined ? { pauseAtPercent: input.pauseAtPercent } : {}),
      updatedAt: new Date(),
    })
    .where(eq(spendLimit.orgId, orgId));

  await refreshSpendPauseState(tx, orgId);
}

/** Stub: monthly number rental lines (managed). */
export async function recordManagedNumberRentals(
  tx: DbTransaction,
  orgId: string,
): Promise<{ recorded: number }> {
  const ref = `rental:${orgId}:${monthStartUtc().toISOString().slice(0, 7)}`;
  const [existing] = await tx
    .select({ id: usageRecord.id })
    .from(usageRecord)
    .where(eq(usageRecord.providerReference, ref))
    .limit(1);

  if (existing) return { recorded: 0 };
  const r = await recordChannelUsage(tx, {
    orgId,
    channel: 'sms',
    unit: 'number_rental',
    quantity: 1,
    providerReference: ref,
    direction: 'outbound',
  });

  return { recorded: r.recorded ? 1 : 0 };
}
