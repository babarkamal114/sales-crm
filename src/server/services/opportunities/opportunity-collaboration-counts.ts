import 'server-only';

import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { opportunityNote, opportunityTask } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';

export type CollaborationCounts = {
  noteCount: number;
  openTaskCount: number;
};

export async function loadCollaborationCountsByOpportunity(
  tx: DbTransaction,
  orgId: string,
  opportunityIds: string[],
): Promise<Map<string, CollaborationCounts>> {
  const result = new Map<string, CollaborationCounts>();
  if (opportunityIds.length === 0) {
    return result;
  }

  for (const id of opportunityIds) {
    result.set(id, { noteCount: 0, openTaskCount: 0 });
  }

  const noteRows = await tx
    .select({
      opportunityId: opportunityNote.opportunityId,
      count: sql<number>`count(*)::int`,
    })
    .from(opportunityNote)
    .where(
      and(
        eq(opportunityNote.orgId, orgId),
        inArray(opportunityNote.opportunityId, opportunityIds),
        isNull(opportunityNote.deletedAt),
      ),
    )
    .groupBy(opportunityNote.opportunityId);

  for (const row of noteRows) {
    const current = result.get(row.opportunityId) ?? { noteCount: 0, openTaskCount: 0 };
    current.noteCount = row.count;
    result.set(row.opportunityId, current);
  }

  const taskRows = await tx
    .select({
      opportunityId: opportunityTask.opportunityId,
      count: sql<number>`count(*)::int`,
    })
    .from(opportunityTask)
    .where(
      and(
        eq(opportunityTask.orgId, orgId),
        inArray(opportunityTask.opportunityId, opportunityIds),
        isNull(opportunityTask.deletedAt),
        isNull(opportunityTask.completedAt),
      ),
    )
    .groupBy(opportunityTask.opportunityId);

  for (const row of taskRows) {
    const current = result.get(row.opportunityId) ?? { noteCount: 0, openTaskCount: 0 };
    current.openTaskCount = row.count;
    result.set(row.opportunityId, current);
  }

  return result;
}
