import 'server-only';

import { and, eq } from 'drizzle-orm';
import type { companyIdVersionSchema } from '@/domain/companies/mutation-schemas';
import type { z } from 'zod';
import { ForbiddenError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import { company, membership } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  assertCompanyVersion,
  CompanyVersionConflictError,
  requireCompany,
} from '@/server/services/companies/company-access';

type Input = z.infer<typeof companyIdVersionSchema> & { ownerId: string };

export async function setCompanyOwner(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ id: string; version: number }> {
  const row = await requireCompany(tx, session, input.companyId, 'contact.update');
  assertCompanyVersion(row, input.version);

  if (session.role === 'member' && input.ownerId !== session.userId) {
    throw new ForbiddenError('Members can only assign themselves as owner.');
  }

  const [member] = await tx
    .select({ userId: membership.userId })
    .from(membership)
    .where(and(eq(membership.orgId, session.orgId), eq(membership.userId, input.ownerId)))
    .limit(1);

  if (!member) {
    throw new ForbiddenError('Owner must be a member of this organisation.');
  }

  if (row.ownerId === input.ownerId) {
    return { id: row.id, version: row.version };
  }

  const now = new Date();
  const [updated] = await tx
    .update(company)
    .set({
      ownerId: input.ownerId,
      version: row.version + 1,
      updatedAt: now,
      updatedBy: session.userId,
      lastActivityAt: now,
    })
    .where(and(eq(company.id, row.id), eq(company.version, row.version)))
    .returning({ id: company.id, version: company.version });

  if (!updated) {
    throw new CompanyVersionConflictError();
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'company.owner_changed',
    entityType: 'company',
    entityId: row.id,
    changes: { ownerId: { from: row.ownerId, to: input.ownerId } },
  });

  return updated;
}
