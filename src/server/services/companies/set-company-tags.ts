import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';
import type { companyIdVersionSchema } from '@/domain/companies/mutation-schemas';
import type { z } from 'zod';
import { writeAudit } from '@/server/audit/write';
import { company, companyTag, tag } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  assertCompanyVersion,
  CompanyVersionConflictError,
  requireCompany,
} from '@/server/services/companies/company-access';

type Input = z.infer<typeof companyIdVersionSchema> & { tagIds: string[] };

export async function setCompanyTags(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ id: string; version: number }> {
  const row = await requireCompany(tx, session, input.companyId, 'contact.update');
  assertCompanyVersion(row, input.version);

  const uniqueTagIds = [...new Set(input.tagIds)];
  if (uniqueTagIds.length > 0) {
    const tags = await tx
      .select({ id: tag.id })
      .from(tag)
      .where(and(eq(tag.orgId, session.orgId), inArray(tag.id, uniqueTagIds)));
    if (tags.length !== uniqueTagIds.length) {
      throw new Error('One or more tags were not found.');
    }
  }

  const existing = await tx
    .select({ tagId: companyTag.tagId })
    .from(companyTag)
    .where(and(eq(companyTag.orgId, session.orgId), eq(companyTag.companyId, row.id)));

  const existingIds = new Set(existing.map((r) => r.tagId));
  const targetIds = new Set(uniqueTagIds);
  const toRemove = [...existingIds].filter((id) => !targetIds.has(id));
  const toAdd = uniqueTagIds.filter((id) => !existingIds.has(id));

  if (toRemove.length === 0 && toAdd.length === 0) {
    return { id: row.id, version: row.version };
  }

  const now = new Date();

  if (toRemove.length > 0) {
    await tx
      .delete(companyTag)
      .where(
        and(
          eq(companyTag.orgId, session.orgId),
          eq(companyTag.companyId, row.id),
          inArray(companyTag.tagId, toRemove),
        ),
      );
  }

  if (toAdd.length > 0) {
    await tx.insert(companyTag).values(
      toAdd.map((tagId) => ({
        orgId: session.orgId,
        companyId: row.id,
        tagId,
      })),
    );
  }

  const [updated] = await tx
    .update(company)
    .set({
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
    action: 'company.tags_changed',
    entityType: 'company',
    entityId: row.id,
    changes: { tagIds: { from: [...existingIds], to: uniqueTagIds } },
  });

  return updated;
}
