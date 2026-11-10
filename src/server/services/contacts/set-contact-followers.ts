import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';
import type { setContactFollowersSchema } from '@/domain/contacts/mutation-schemas';
import type { z } from 'zod';
import { writeAudit } from '@/server/audit/write';
import { contact, contactFollower, membership } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  assertContactVersion,
  requireContact,
  touchContactActivity,
  VersionConflictError,
} from '@/server/services/contacts/contact-access';

type Input = z.infer<typeof setContactFollowersSchema>;

export async function setContactFollowers(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ id: string; version: number }> {
  const row = await requireContact(tx, session, input.contactId);
  assertContactVersion(row, input.version);

  const uniqueIds = [...new Set(input.followerUserIds)];
  if (uniqueIds.length > 0) {
    const members = await tx
      .select({ userId: membership.userId })
      .from(membership)
      .where(
        and(eq(membership.orgId, session.orgId), inArray(membership.userId, uniqueIds)),
      );
    if (members.length !== uniqueIds.length) {
      throw new Error('All followers must be organisation members.');
    }
  }

  const existing = await tx
    .select({ userId: contactFollower.userId })
    .from(contactFollower)
    .where(
      and(eq(contactFollower.orgId, session.orgId), eq(contactFollower.contactId, row.id)),
    );

  const existingIds = new Set(existing.map((r) => r.userId));
  const targetIds = new Set(uniqueIds);

  const toRemove = [...existingIds].filter((id) => !targetIds.has(id));
  const toAdd = uniqueIds.filter((id) => !existingIds.has(id));

  if (toRemove.length === 0 && toAdd.length === 0) {
    return { id: row.id, version: row.version };
  }

  const now = new Date();

  if (toRemove.length > 0) {
    await tx
      .delete(contactFollower)
      .where(
        and(
          eq(contactFollower.orgId, session.orgId),
          eq(contactFollower.contactId, row.id),
          inArray(contactFollower.userId, toRemove),
        ),
      );
  }

  if (toAdd.length > 0) {
    await tx.insert(contactFollower).values(
      toAdd.map((userId) => ({
        orgId: session.orgId,
        contactId: row.id,
        userId,
        createdBy: session.userId,
      })),
    );
  }

  const [updated] = await tx
    .update(contact)
    .set({
      version: row.version + 1,
      updatedAt: now,
      updatedBy: session.userId,
      lastActivityAt: now,
    })
    .where(and(eq(contact.id, row.id), eq(contact.version, row.version)))
    .returning({ id: contact.id, version: contact.version });

  if (!updated) {
    throw new VersionConflictError();
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'contact.followers_changed',
    entityType: 'contact',
    entityId: row.id,
    changes: {
      added: { to: toAdd },
      removed: { to: toRemove },
    },
  });

  await touchContactActivity(tx, session, row.id, now);
  return updated;
}
