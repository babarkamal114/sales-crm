import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import type { Capability } from '@/server/access/capabilities';
import { NotFoundError, assertCan } from '@/server/access/capabilities';
import { company } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export class CompanyVersionConflictError extends Error {
  readonly code = 'CONFLICT' as const;
  constructor() {
    super('Someone else updated this company.');
    this.name = 'CompanyVersionConflictError';
  }
}

type RequireOptions = {
  includeDeleted?: boolean;
};

export async function requireCompany(
  tx: DbTransaction,
  session: TenantSession,
  companyId: string,
  capability: Capability = 'contact.view',
  options?: RequireOptions,
) {
  assertCan(session, capability);

  const filters = [eq(company.orgId, session.orgId), eq(company.id, companyId)];
  if (!options?.includeDeleted) {
    filters.push(isNull(company.deletedAt));
  }

  const [row] = await tx
    .select()
    .from(company)
    .where(and(...filters))
    .limit(1);

  if (!row) {
    throw new NotFoundError('Company not found.');
  }

  if (!options?.includeDeleted && row.mergedIntoId) {
    throw new NotFoundError('Company not found.');
  }

  return row;
}

export function assertCompanyVersion(
  row: { version: number },
  expectedVersion: number,
): void {
  if (row.version !== expectedVersion) {
    throw new CompanyVersionConflictError();
  }
}
