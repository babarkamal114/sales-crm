import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import { assertCan, NotFoundError } from '@/server/access/capabilities';
import { contact } from '@/server/db/schema';
import type { Capability } from '@/server/access/capabilities';
import type { Contact } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export class VersionConflictError extends Error {
  readonly code = 'CONFLICT' as const;

  constructor(message = 'Someone else updated this contact.') {
    super(message);
    this.name = 'VersionConflictError';
  }
}

export async function requireContactView(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
): Promise<Contact> {
  return requireContact(tx, session, contactId, 'contact.view');
}

export async function requireContact(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
  capability: Capability = 'contact.update',
  options?: { includeDeleted?: boolean },
): Promise<Contact> {
  assertCan(session, capability);

  const predicates = [
    eq(contact.orgId, session.orgId),
    eq(contact.id, contactId),
  ];
  if (!options?.includeDeleted) {
    predicates.push(isNull(contact.deletedAt));
  }

  const [row] = await tx
    .select()
    .from(contact)
    .where(and(...predicates))
    .limit(1);

  if (!row) {
    throw new NotFoundError('Contact not found.');
  }

  return row;
}

export async function touchContactActivity(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
  at: Date,
): Promise<void> {
  await tx
    .update(contact)
    .set({
      lastActivityAt: at,
      updatedAt: at,
      updatedBy: session.userId,
    })
    .where(and(eq(contact.orgId, session.orgId), eq(contact.id, contactId)));
}

export function assertContactVersion(row: Contact, expectedVersion: number): void {
  if (row.version !== expectedVersion) {
    throw new VersionConflictError();
  }
}
