import 'server-only';

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { runMailboxContactBackfill } from '@/server/jobs/channels/mailbox-contact-backfill';
import { runMailboxInitialSync } from '@/server/jobs/channels/mailbox-initial-sync';
import { runSendOutboundMessage } from '@/server/jobs/conversations/send-outbound-message';
import { outboxEvent } from '@/server/db/schema';
import { withTenantSystem } from '@/server/db/with-tenant';

/** Dispatches outbox rows after commit (until Inngest wiring lands). */
export async function dispatchOutboxEventIds(orgId: string, eventIds: string[]): Promise<void> {
  const ids = eventIds.filter(Boolean);
  if (ids.length === 0) return;

  const rows = await withTenantSystem(orgId, async (tx) =>
    tx
      .select()
      .from(outboxEvent)
      .where(and(eq(outboxEvent.orgId, orgId), inArray(outboxEvent.id, ids))),
  );

  for (const row of rows) {
    if (row.dispatchedAt) continue;
    try {
      if (row.type === 'crm/message.send') {
        await runSendOutboundMessage(row.payload);
      } else if (row.type === 'crm/mailbox.initial_sync') {
        await runMailboxInitialSync(row.payload);
      } else if (row.type === 'crm/mailbox.contact_backfill') {
        await runMailboxContactBackfill(row.payload);
      }
      await withTenantSystem(orgId, async (tx) => {
        await tx
          .update(outboxEvent)
          .set({ dispatchedAt: new Date() })
          .where(eq(outboxEvent.id, row.id));
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'MessageSendRetryError') {
        continue;
      }
      throw error;
    }
  }
}

/** Sweeper: pending events older than threshold (cron / Inngest later). */
export async function dispatchPendingOutbox(orgId: string, limit = 20): Promise<number> {
  const rows = await withTenantSystem(orgId, async (tx) =>
    tx
      .select({ id: outboxEvent.id })
      .from(outboxEvent)
      .where(isNull(outboxEvent.dispatchedAt))
      .limit(limit),
  );

  await dispatchOutboxEventIds(
    orgId,
    rows.map((r) => r.id),
  );
  return rows.length;
}
