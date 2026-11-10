import 'server-only';

import { and, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import { assertCan } from '@/server/access/capabilities';
import { contact } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export type ContactPickerRow = {
  id: string;
  displayName: string;
  email: string | null;
  phoneE164: string | null;
  version: number;
};

export async function searchContacts(
  tx: DbTransaction,
  session: TenantSession,
  query: string,
  limit = 20,
): Promise<ContactPickerRow[]> {
  assertCan(session, 'contact.view');

  const q = query.trim();
  if (q.length < 1) {
    return [];
  }

  const pattern = `%${q.replace(/[%_\\]/g, '\\$&')}%`;

  const rows = await tx
    .select({
      id: contact.id,
      displayName: contact.displayName,
      email: contact.email,
      phoneE164: contact.phoneE164,
      version: contact.version,
    })
    .from(contact)
    .where(
      and(
        eq(contact.orgId, session.orgId),
        isNull(contact.deletedAt),
        or(
          ilike(contact.displayName, pattern),
          ilike(contact.email, pattern),
          ilike(contact.phoneE164, pattern),
          ilike(contact.firstName, pattern),
          ilike(contact.lastName, pattern),
        ),
      ),
    )
    .orderBy(desc(contact.lastActivityAt))
    .limit(Math.min(limit, 50));

  return rows;
}
