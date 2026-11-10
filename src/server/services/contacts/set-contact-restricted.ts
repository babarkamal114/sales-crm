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
  touchContactActivity,
  VersionConflictError,
} from '@/server/services/contacts/contact-access';

type Input = z.infer<typeof contactIdVersionSchema> & { restricted: boolean };

export async function setContactRestricted(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ id: string; version: number }> {
  const row = await requireContact(tx, session, input.contactId, 'contact.restrict');
  assertContactVersion(row, input.version);

  if (row.restricted === input.restricted) {
    return { id: row.id, version: row.version };
  }

  const now = new Date();
  const [updated] = await tx
    .update(contact)
    .set({
      restricted: input.restricted,
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
    action: 'contact.restricted',
    entityType: 'contact',
    entityId: row.id,
    changes: { restricted: { from: row.restricted, to: input.restricted } },
  });

  await touchContactActivity(tx, session, row.id, now);
  return updated;
}
