import 'server-only';

import { and, asc, eq, isNull } from 'drizzle-orm';
import { assertCanAccessPipeline } from '@/server/access/pipeline-access';
import { pipeline, pipelineMember, pipelineStage, user } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export type PipelineCreateMeta = {
  pipelineId: string;
  pipelineName: string;
  stages: { id: string; name: string; kind: string; probability: number | null }[];
  members: { id: string; fullName: string }[];
};

export async function getPipelineCreateMeta(
  tx: DbTransaction,
  session: TenantSession,
  pipelineId: string,
): Promise<PipelineCreateMeta> {
  await assertCanAccessPipeline(tx, session, pipelineId);

  const [pipe] = await tx
    .select({ id: pipeline.id, name: pipeline.name })
    .from(pipeline)
    .where(and(eq(pipeline.orgId, session.orgId), eq(pipeline.id, pipelineId)))
    .limit(1);

  if (!pipe) {
    throw new Error('Pipeline not found.');
  }

  const stages = await tx
    .select({
      id: pipelineStage.id,
      name: pipelineStage.name,
      kind: pipelineStage.kind,
      probability: pipelineStage.probability,
    })
    .from(pipelineStage)
    .where(
      and(
        eq(pipelineStage.orgId, session.orgId),
        eq(pipelineStage.pipelineId, pipelineId),
        isNull(pipelineStage.archivedAt),
      ),
    )
    .orderBy(asc(pipelineStage.position));

  const members = await tx
    .select({ id: user.id, fullName: user.fullName })
    .from(pipelineMember)
    .innerJoin(user, eq(pipelineMember.userId, user.id))
    .where(
      and(eq(pipelineMember.orgId, session.orgId), eq(pipelineMember.pipelineId, pipelineId)),
    )
    .orderBy(asc(user.fullName));

  return {
    pipelineId: pipe.id,
    pipelineName: pipe.name,
    stages,
    members: members.map((row) => ({
      id: row.id,
      fullName: row.fullName?.trim() || 'User',
    })),
  };
}
