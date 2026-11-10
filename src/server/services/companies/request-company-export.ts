import 'server-only';

import { writeAudit } from '@/server/audit/write';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { requireCompany } from '@/server/services/companies/company-access';

/** Records a company export request; file delivery is handled by a future job. */
export async function requestCompanyExport(
  tx: DbTransaction,
  session: TenantSession,
  companyId: string,
): Promise<{ requestId: string; status: 'queued' }> {
  await requireCompany(tx, session, companyId, 'contact.update');

  const requestId = crypto.randomUUID();

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'company.export_requested',
    entityType: 'company',
    entityId: companyId,
    metadata: { requestId, status: 'queued' },
  });

  return { requestId, status: 'queued' };
}
