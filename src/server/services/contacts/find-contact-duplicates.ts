import 'server-only';

import { and, eq, isNull, ne, or, sql } from 'drizzle-orm';
import { normaliseEmail, normalisePhone } from '@/domain/contacts/normalise';
import { assertCan, NotFoundError } from '@/server/access/capabilities';
import { contact } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export type DuplicateCandidate = {
  id: string;
  displayName: string;
  email: string | null;
  phoneE164: string | null;
  matchedOn: 'email' | 'phone' | 'name';
};

export async function findContactDuplicates(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
): Promise<DuplicateCandidate[]> {
  assertCan(session, 'contact.view');

  const [row] = await tx
    .select()
    .from(contact)
    .where(
      and(
        eq(contact.orgId, session.orgId),
        eq(contact.id, contactId),
        isNull(contact.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError('Contact not found.');
  }

  const emailNorm = normaliseEmail(row.email);
  const phone = normalisePhone(row.phoneE164);
  const namePattern = `${row.firstName} ${row.lastName}`.trim();

  const predicates = [];
  if (emailNorm) {
    predicates.push(eq(contact.emailNormalised, emailNorm));
  }
  if (phone) {
    predicates.push(eq(contact.phoneE164, phone));
  }
  if (namePattern.length >= 3) {
    const nameLower = namePattern.toLowerCase();
    predicates.push(
      and(
        sql`lower(trim(${contact.firstName} || ' ' || ${contact.lastName})) = ${nameLower}`,
        row.companyId ? eq(contact.companyId, row.companyId) : sql`${contact.companyId} is null`,
      )!,
    );
  }

  if (predicates.length === 0) {
    return [];
  }

  const matches = await tx
    .select({
      id: contact.id,
      displayName: contact.displayName,
      email: contact.email,
      phoneE164: contact.phoneE164,
      emailNormalised: contact.emailNormalised,
      phoneE164Match: contact.phoneE164,
    })
    .from(contact)
    .where(
      and(
        eq(contact.orgId, session.orgId),
        ne(contact.id, contactId),
        isNull(contact.deletedAt),
        isNull(contact.mergedIntoId),
        or(...predicates),
      ),
    )
    .limit(20);

  return matches.map((match) => {
    let matchedOn: DuplicateCandidate['matchedOn'] = 'name';
    if (emailNorm && match.emailNormalised === emailNorm) {
      matchedOn = 'email';
    } else if (phone && match.phoneE164Match === phone) {
      matchedOn = 'phone';
    }
    return {
      id: match.id,
      displayName: match.displayName,
      email: match.email,
      phoneE164: match.phoneE164,
      matchedOn,
    };
  });
}
