import 'server-only';

import { and, eq, sql } from 'drizzle-orm';
import { company, companyStats } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';
import { refreshCompanyContactCount } from '@/server/services/companies/contact-company-link';

/** Recomputes rolled-up deal metrics and contact count for one company. */
export async function refreshCompanyStats(
  tx: DbTransaction,
  orgId: string,
  companyId: string,
): Promise<void> {
  const openDealCountSql = sql<number>`(
    select count(*)::int
    from crm.opportunity o
    where o.org_id = ${orgId}
      and o.deleted_at is null
      and o.company_id = ${companyId}
      and o.status = 'open'
  )`;

  const openPipelineSql = sql<number>`(
    select coalesce(sum(o.value_pence), 0)::bigint
    from crm.opportunity o
    where o.org_id = ${orgId}
      and o.deleted_at is null
      and o.company_id = ${companyId}
      and o.status = 'open'
  )`;

  const wonTotalSql = sql<number>`(
    select coalesce(sum(o.value_pence), 0)::bigint
    from crm.opportunity o
    where o.org_id = ${orgId}
      and o.deleted_at is null
      and o.company_id = ${companyId}
      and o.status = 'won'
  )`;

  const [row] = await tx
    .select({
      openDealCount: openDealCountSql,
      openPipelineValue: openPipelineSql,
      wonValueTotal: wonTotalSql,
    })
    .from(company)
    .where(and(eq(company.id, companyId), eq(company.orgId, orgId)))
    .limit(1);

  await tx
    .update(companyStats)
    .set({
      openDealCount: row?.openDealCount ?? 0,
      openPipelineValue: Number(row?.openPipelineValue ?? 0),
      wonValueTotal: Number(row?.wonValueTotal ?? 0),
      updatedAt: new Date(),
    })
    .where(and(eq(companyStats.companyId, companyId), eq(companyStats.orgId, orgId)));

  await refreshCompanyContactCount(tx, orgId, companyId);
}
