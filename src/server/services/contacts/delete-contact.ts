import 'server-only';

import { and, eq } from 'drizzle-orm';
import type { contactIdVersionSchema } from '@/domain/contacts/mutation-schemas';
import type { z } from 'zod';
import { writeAudit } from '@/server/audit/write';
import { contact } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  assertContactVersion,
  requireContact,
  VersionConflictError,
} from '@/server/services/contacts/contact-access';

type Input = z.infer<typeof contactIdVersionSchema>;

export async function deleteContact(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ id: string }> {
  const row = await requireContact(tx, session, input.contactId, 'contact.delete');
  assertContactVersion(row, input.version);

  const now = new Date();
  const [updated] = await tx
    .update(contact)
    .set({
      deletedAt: now,
      version: row.version + 1,
      updatedAt: now,
      updatedBy: session.userId,
    })
    .where(and(eq(contact.id, row.id), eq(contact.version, row.version)))
    .returning({ id: contact.id });

  if (!updated) {
    throw new VersionConflictError();
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'contact.deleted',
    entityType: 'contact',
    entityId: row.id,
    changes: { deletedAt: { from: null, to: now.toISOString() } },
  });

  return { id: row.id };
}

export async function restoreContact(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
): Promise<{ id: string; version: number }> {
  const row = await requireContact(tx, session, contactId, 'contact.delete', {
    includeDeleted: true,
  });

  if (!row.deletedAt) {
    return { id: row.id, version: row.version };
  }

  const now = new Date();
  const [updated] = await tx
    .update(contact)
    .set({
      deletedAt: null,
      version: row.version + 1,
      updatedAt: now,
      updatedBy: session.userId,
      lastActivityAt: now,
    })
    .where(eq(contact.id, row.id))
    .returning({ id: contact.id, version: contact.version });

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'contact.restored',
    entityType: 'contact',
    entityId: row.id,
    changes: { deletedAt: { from: row.deletedAt.toISOString(), to: null } },
  });

  return updated!;
}
