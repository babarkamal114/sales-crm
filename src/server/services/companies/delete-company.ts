import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import type { companyIdVersionSchema } from '@/domain/companies/mutation-schemas';
import type { z } from 'zod';
import { assertCan } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import { company, contact, contactCompany, opportunity } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  assertCompanyVersion,
  CompanyVersionConflictError,
  requireCompany,
} from '@/server/services/companies/company-access';

type Input = z.infer<typeof companyIdVersionSchema>;

export async function deleteCompany(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ id: string }> {
  assertCan(session, 'contact.delete');
  const row = await requireCompany(tx, session, input.companyId, 'contact.delete');
  assertCompanyVersion(row, input.version);

  const now = new Date();

  await tx
    .update(contact)
    .set({
      companyId: null,
      updatedAt: now,
      updatedBy: session.userId,
    })
    .where(
      and(
        eq(contact.orgId, session.orgId),
        eq(contact.companyId, row.id),
        isNull(contact.deletedAt),
      ),
    );

  await tx
    .delete(contactCompany)
    .where(and(eq(contactCompany.orgId, session.orgId), eq(contactCompany.companyId, row.id)));

  await tx
    .update(opportunity)
    .set({
      companyId: null,
      updatedAt: now,
      updatedBy: session.userId,
    })
    .where(
      and(
        eq(opportunity.orgId, session.orgId),
        eq(opportunity.companyId, row.id),
        isNull(opportunity.deletedAt),
      ),
    );

  await tx
    .update(company)
    .set({ parentCompanyId: null, updatedAt: now, updatedBy: session.userId })
    .where(
      and(
        eq(company.orgId, session.orgId),
        eq(company.parentCompanyId, row.id),
        isNull(company.deletedAt),
      ),
    );

  const [updated] = await tx
    .update(company)
    .set({
      deletedAt: now,
      version: row.version + 1,
      updatedAt: now,
      updatedBy: session.userId,
    })
    .where(and(eq(company.id, row.id), eq(company.version, row.version)))
    .returning({ id: company.id });

  if (!updated) {
    throw new CompanyVersionConflictError();
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'company.deleted',
    entityType: 'company',
    entityId: row.id,
    changes: { deletedAt: { from: null, to: now.toISOString() } },
  });

  return { id: row.id };
}
