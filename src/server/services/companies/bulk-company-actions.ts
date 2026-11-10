import 'server-only';

import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { bulkCompanyActionSchema } from '@/domain/companies/mutation-schemas';
import type { z } from 'zod';
import { assertCan, ForbiddenError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import { company, companyTag } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { deleteCompany } from '@/server/services/companies/delete-company';
import { requestCompanyExport } from '@/server/services/companies/request-company-export';
import { setCompanyOwner } from '@/server/services/companies/set-company-owner';
import { setCompanyTags } from '@/server/services/companies/set-company-tags';

type Input = z.infer<typeof bulkCompanyActionSchema>;

const SYNC_LIMIT = 50;

export type BulkCompanyResult = {
  processed: number;
  skipped: number;
  skippedIds: string[];
  jobQueued?: boolean;
};

export async function runBulkCompanyAction(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<BulkCompanyResult> {
  assertCan(session, 'contact.update');

  if (input.companyIds.length > SYNC_LIMIT) {
    await writeAudit(tx, {
      orgId: session.orgId,
      actorType: 'user',
      actorId: session.userId,
      action: 'company.bulk_action',
      entityType: 'company',
      changes: { action: { to: input.action }, count: { to: input.companyIds.length } },
      metadata: { status: 'queued', companyIds: input.companyIds },
    });
    return {
      processed: 0,
      skipped: 0,
      skippedIds: [],
      jobQueued: true,
    };
  }

  const visibleRows = await tx
    .select({ id: company.id, version: company.version })
    .from(company)
    .where(
      and(
        eq(company.orgId, session.orgId),
        inArray(company.id, input.companyIds),
        isNull(company.deletedAt),
        isNull(company.mergedIntoId),
      ),
    );

  const visibleById = new Map(visibleRows.map((r) => [r.id, r]));
  const skippedIds = input.companyIds.filter((id) => !visibleById.has(id));

  let processed = 0;

  async function loadRow(companyId: string) {
    const [row] = await tx
      .select({ id: company.id, version: company.version })
      .from(company)
      .where(
        and(
          eq(company.orgId, session.orgId),
          eq(company.id, companyId),
          isNull(company.deletedAt),
        ),
      )
      .limit(1);
    return row;
  }

  switch (input.action) {
    case 'owner': {
      if (session.role === 'member') {
        throw new ForbiddenError('Members cannot bulk-change owners.');
      }
      for (const companyId of visibleById.keys()) {
        const row = await loadRow(companyId);
        if (!row) continue;
        await setCompanyOwner(tx, session, {
          companyId: row.id,
          version: row.version,
          ownerId: input.ownerId,
        });
        processed += 1;
      }
      break;
    }
    case 'tag': {
      for (const companyId of visibleById.keys()) {
        const row = await loadRow(companyId);
        if (!row) continue;
        let tagIds = input.tagIds;
        if (input.mode === 'add') {
          const existing = await tx
            .select({ tagId: companyTag.tagId })
            .from(companyTag)
            .where(
              and(eq(companyTag.orgId, session.orgId), eq(companyTag.companyId, row.id)),
            );
          tagIds = [...new Set([...existing.map((t) => t.tagId), ...input.tagIds])];
        }
        await setCompanyTags(tx, session, {
          companyId: row.id,
          version: row.version,
          tagIds,
        });
        processed += 1;
      }
      break;
    }
    case 'delete': {
      assertCan(session, 'contact.delete');
      for (const companyId of visibleById.keys()) {
        const row = await loadRow(companyId);
        if (!row) continue;
        await deleteCompany(tx, session, { companyId: row.id, version: row.version });
        processed += 1;
      }
      break;
    }
    case 'export': {
      for (const companyId of visibleById.keys()) {
        await requestCompanyExport(tx, session, companyId);
        processed += 1;
      }
      break;
    }
    default:
      break;
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'company.bulk_action',
    entityType: 'company',
    changes: { action: { to: input.action }, processed: { to: processed } },
  });

  return {
    processed,
    skipped: skippedIds.length,
    skippedIds,
  };
}
