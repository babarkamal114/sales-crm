import 'server-only';

import { and, eq } from 'drizzle-orm';
import { mailboxConnection, mailboxSyncState } from '@/server/db/schema';
import { withTenant } from '@/server/db/with-tenant';
import {
  gmailApiFetch,
  resolveGoogleMailboxAccessToken,
} from '@/server/integrations/google-mailbox-client';
import { enqueueOutbox } from '@/server/outbox/enqueue';

type Payload = { orgId: string; mailboxId: string; userId: string };

/** Seeds Gmail sync cursor after connect, then queues contact-scoped backfill. */
export async function runMailboxInitialSync(raw: unknown): Promise<{ outcome: string }> {
  const data = raw as Payload;
  if (!data?.orgId || !data.mailboxId || !data.userId) {
    return { outcome: 'invalid_payload' };
  }

  let backfillOutboxId: string | null = null;

  const outcome = await withTenant(
    { orgId: data.orgId, userId: data.userId, role: 'admin' },
    async (tx) => {
      const [mailbox] = await tx
        .select()
        .from(mailboxConnection)
        .where(
          and(
            eq(mailboxConnection.orgId, data.orgId),
            eq(mailboxConnection.id, data.mailboxId),
          ),
        )
        .limit(1);

      if (!mailbox) return { outcome: 'mailbox_not_found' };

      let gmailHistoryId: string | null = null;

      if (mailbox.provider === 'google') {
        const accessToken = await resolveGoogleMailboxAccessToken(
          tx,
          data.mailboxId,
          data.userId,
          mailbox,
        );
        if (accessToken) {
          const res = await gmailApiFetch(accessToken, '/profile');
          if (res.ok) {
            const profile = (await res.json()) as { historyId?: string };
            gmailHistoryId = profile.historyId ?? null;
          }
        }
      }

      const now = new Date();
      await tx
        .update(mailboxSyncState)
        .set({
          ...(gmailHistoryId ? { gmailHistoryId } : {}),
          backfillStatus: 'pending',
        })
        .where(eq(mailboxSyncState.mailboxId, data.mailboxId));

      await tx
        .update(mailboxConnection)
        .set({
          status: 'active',
          lastSyncedAt: now,
          updatedAt: now,
          updatedBy: data.userId,
        })
        .where(eq(mailboxConnection.id, data.mailboxId));

      backfillOutboxId = await enqueueOutbox(tx, {
        orgId: data.orgId,
        type: 'crm/mailbox.contact_backfill',
        payload: {
          orgId: data.orgId,
          mailboxId: data.mailboxId,
          userId: data.userId,
          offset: 0,
        },
      });

      return { outcome: 'ok' };
    },
  );

  if (backfillOutboxId) {
    const { dispatchOutboxEventIds } = await import('@/server/outbox/dispatch');
    await dispatchOutboxEventIds(data.orgId, [backfillOutboxId]);
  }

  return outcome;
}
