import 'server-only';

import { cache } from 'react';
import { and, eq, isNull } from 'drizzle-orm';
import { NotFoundError } from '@/server/access/capabilities';
import { pipeline, pipelineMember } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

function isManagerRole(role: TenantSession['role']): boolean {
  return role === 'admin' || role === 'manager';
}

export const visiblePipelineIds = cache(
  async (tx: DbTransaction, session: TenantSession): Promise<string[]> => {
    if (isManagerRole(session.role)) {
      const rows = await tx
        .select({ id: pipeline.id })
        .from(pipeline)
        .where(and(eq(pipeline.orgId, session.orgId), isNull(pipeline.archivedAt)));
      return rows.map((row) => row.id);
    }

    const rows = await tx
      .select({ pipelineId: pipelineMember.pipelineId })
      .from(pipelineMember)
      .innerJoin(pipeline, eq(pipelineMember.pipelineId, pipeline.id))
      .where(
        and(
          eq(pipelineMember.orgId, session.orgId),
          eq(pipelineMember.userId, session.userId),
          isNull(pipeline.archivedAt),
        ),
      );

    return rows.map((row) => row.pipelineId);
  },
);

export async function assertCanAccessPipeline(
  tx: DbTransaction,
  session: TenantSession,
  pipelineId: string,
): Promise<void> {
  const allowed = await visiblePipelineIds(tx, session);
  if (!allowed.includes(pipelineId)) {
    throw new NotFoundError('Pipeline not found.');
  }
}
