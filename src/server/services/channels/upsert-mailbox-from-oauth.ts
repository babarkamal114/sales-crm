import 'server-only';

import { and, eq } from 'drizzle-orm';
import type { IntegrationProviderId } from '@/domain/integrations/catalog';
import { mailboxConnection, mailboxSyncState } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';
import { enqueueOutbox } from '@/server/outbox/enqueue';

function mapProvider(provider: IntegrationProviderId): 'google' | 'microsoft' | null {
  if (provider === 'google_mail') return 'google';
  if (provider === 'microsoft_mail') return 'microsoft';
  return null;
}

/** Creates or updates the connecting user's personal mailbox after OAuth. */
export async function upsertMailboxFromOAuth(
  tx: DbTransaction,
  input: {
    orgId: string;
    userId: string;
    provider: IntegrationProviderId;
    email: string;
    accessTokenEnc: string;
    refreshTokenEnc?: string;
    accessTokenExpiresAt?: string;
    scopes?: string[];
  },
): Promise<{ mailboxId: string; syncOutboxEventId: string }> {
  const mapped = mapProvider(input.provider);
  if (!mapped) throw new Error('Provider does not use mailbox_connection');

  const now = new Date();
  const tokenExpiresAt = input.accessTokenExpiresAt
    ? new Date(input.accessTokenExpiresAt)
    : null;

  const [existing] = await tx
    .select({ id: mailboxConnection.id })
    .from(mailboxConnection)
    .where(
      and(
        eq(mailboxConnection.orgId, input.orgId),
        eq(mailboxConnection.userId, input.userId),
        eq(mailboxConnection.kind, 'personal'),
      ),
    )
    .limit(1);

  if (existing) {
    await tx
      .update(mailboxConnection)
      .set({
        provider: mapped,
        emailAddress: input.email,
        accessTokenCiphertext: input.accessTokenEnc,
        refreshTokenCiphertext: input.refreshTokenEnc ?? null,
        tokenExpiresAt,
        scopes: input.scopes ?? null,
        status: 'syncing_initial',
        statusReason: null,
        connectedAt: now,
        updatedAt: now,
        updatedBy: input.userId,
      })
      .where(eq(mailboxConnection.id, existing.id));

    const syncOutboxEventId = await enqueueOutbox(tx, {
      orgId: input.orgId,
      type: 'crm/mailbox.initial_sync',
      payload: {
        orgId: input.orgId,
        mailboxId: existing.id,
        userId: input.userId,
      },
    });
    return { mailboxId: existing.id, syncOutboxEventId };
  }

  const [created] = await tx
    .insert(mailboxConnection)
    .values({
      orgId: input.orgId,
      userId: input.userId,
      kind: 'personal',
      provider: mapped,
      emailAddress: input.email,
      accessTokenCiphertext: input.accessTokenEnc,
      refreshTokenCiphertext: input.refreshTokenEnc ?? null,
      tokenExpiresAt,
      scopes: input.scopes ?? null,
      status: 'syncing_initial',
      syncMode: 'push',
      connectedAt: now,
      createdBy: input.userId,
      updatedBy: input.userId,
    })
    .returning({ id: mailboxConnection.id });

  await tx.insert(mailboxSyncState).values({
    mailboxId: created!.id,
    orgId: input.orgId,
    backfillStatus: 'pending',
    backfillFrom: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  });

  const syncOutboxEventId = await enqueueOutbox(tx, {
    orgId: input.orgId,
    type: 'crm/mailbox.initial_sync',
    payload: {
      orgId: input.orgId,
      mailboxId: created!.id,
      userId: input.userId,
    },
  });

  return { mailboxId: created!.id, syncOutboxEventId };
}
