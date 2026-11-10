import 'server-only';

import { and, desc, eq, ilike, isNull, or } from 'drizzle-orm';
import { assertCan } from '@/server/access/capabilities';
import { company } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export type CompanySearchRow = {
  id: string;
  name: string;
  domain: string | null;
};

export async function searchCompanies(
  tx: DbTransaction,
  session: TenantSession,
  query: string,
  limit = 20,
): Promise<CompanySearchRow[]> {
  assertCan(session, 'contact.view');

  const q = query.trim();
  if (q.length < 1) {
    return [];
  }

  const pattern = `%${q.replace(/[%_\\]/g, '\\$&')}%`;

  return tx
    .select({
      id: company.id,
      name: company.name,
      domain: company.domain,
    })
    .from(company)
    .where(
      and(
        eq(company.orgId, session.orgId),
        isNull(company.deletedAt),
        or(ilike(company.name, pattern), ilike(company.domain, pattern)),
      ),
    )
    .orderBy(desc(company.updatedAt))
    .limit(Math.min(limit, 50));
}
