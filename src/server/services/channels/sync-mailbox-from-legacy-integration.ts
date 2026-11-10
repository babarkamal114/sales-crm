import 'server-only';

import { and, eq } from 'drizzle-orm';
import { integrationConnection, mailboxConnection } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';
import { upsertMailboxFromOAuth } from '@/server/services/channels/upsert-mailbox-from-oauth';

/** One-time bridge: org-level google_mail integration → user's personal mailbox row. */
export async function ensurePersonalMailboxFromLegacyGoogle(
  tx: DbTransaction,
  orgId: string,
  userId: string,
): Promise<string | null> {
  const [mailbox] = await tx
    .select({ id: mailboxConnection.id })
    .from(mailboxConnection)
    .where(
      and(
        eq(mailboxConnection.orgId, orgId),
        eq(mailboxConnection.userId, userId),
        eq(mailboxConnection.kind, 'personal'),
      ),
    )
    .limit(1);

  if (mailbox) return mailbox.id;

  const [legacy] = await tx
    .select({
      metadata: integrationConnection.metadata,
      connectedBy: integrationConnection.connectedBy,
      externalAccountId: integrationConnection.externalAccountId,
    })
    .from(integrationConnection)
    .where(
      and(
        eq(integrationConnection.orgId, orgId),
        eq(integrationConnection.provider, 'google_mail'),
        eq(integrationConnection.status, 'connected'),
      ),
    )
    .limit(1);

  if (!legacy) return null;

  const meta = legacy.metadata as Record<string, unknown>;
  const accessTokenEnc = meta.accessTokenEnc as string | undefined;
  if (!accessTokenEnc) return null;

  const email =
    (meta.email as string | undefined) ??
    legacy.externalAccountId ??
    'unknown@example.com';

  const { mailboxId } = await upsertMailboxFromOAuth(tx, {
    orgId,
    userId,
    provider: 'google_mail',
    email,
    accessTokenEnc,
    ...(typeof meta.refreshTokenEnc === 'string'
      ? { refreshTokenEnc: meta.refreshTokenEnc }
      : {}),
    ...(typeof meta.accessTokenExpiresAt === 'string'
      ? { accessTokenExpiresAt: meta.accessTokenExpiresAt }
      : {}),
  });

  const now = new Date();
  await tx
    .update(mailboxConnection)
    .set({ status: 'active', lastSyncedAt: now, updatedAt: now, updatedBy: userId })
    .where(eq(mailboxConnection.id, mailboxId));

  return mailboxId;
}
