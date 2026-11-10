import 'server-only';

import { and, eq } from 'drizzle-orm';
import type { setContactOwnerSchema } from '@/domain/contacts/mutation-schemas';
import type { z } from 'zod';
import { ForbiddenError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import { contact, membership } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  assertContactVersion,
  requireContact,
  touchContactActivity,
  VersionConflictError,
} from '@/server/services/contacts/contact-access';

type Input = z.infer<typeof setContactOwnerSchema>;

export async function setContactOwner(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ id: string; version: number }> {
  const row = await requireContact(tx, session, input.contactId);
  assertContactVersion(row, input.version);

  if (session.role === 'member' && input.ownerId !== session.userId) {
    throw new ForbiddenError('Members can only assign themselves as owner.');
  }

  const [member] = await tx
    .select({ userId: membership.userId })
    .from(membership)
    .where(and(eq(membership.orgId, session.orgId), eq(membership.userId, input.ownerId)))
    .limit(1);

  if (!member) {
    throw new ForbiddenError('Owner must be a member of this organisation.');
  }

  if (row.ownerId === input.ownerId) {
    return { id: row.id, version: row.version };
  }

  const now = new Date();
  const [updated] = await tx
    .update(contact)
    .set({
      ownerId: input.ownerId,
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
    action: 'contact.owner_changed',
    entityType: 'contact',
    entityId: row.id,
    changes: { ownerId: { from: row.ownerId, to: input.ownerId } },
  });

  await touchContactActivity(tx, session, row.id, now);
  return updated;
}
