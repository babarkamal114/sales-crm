import 'server-only';

import { and, eq, inArray, or } from 'drizzle-orm';
import type { PipelineIdInput } from '@/domain/pipeline/schemas';
import { assertCan, NotFoundError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import {
  activityEvent,
  opportunity,
  opportunityStageHistory,
  pipeline,
  pipelineMember,
  pipelineStage,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export type DeletePipelineResult = {
  id: string;
  deletedOpportunities: number;
  deletedStages: number;
};

export async function deletePipeline(
  tx: DbTransaction,
  session: TenantSession,
  input: PipelineIdInput,
): Promise<DeletePipelineResult> {
  assertCan(session, 'settings.pipelines.manage');

  const [current] = await tx
    .select({ id: pipeline.id, name: pipeline.name })
    .from(pipeline)
    .where(and(eq(pipeline.id, input.pipelineId), eq(pipeline.orgId, session.orgId)))
    .limit(1);

  if (!current) {
    throw new NotFoundError('Pipeline not found.');
  }

  const stages = await tx
    .select({ id: pipelineStage.id })
    .from(pipelineStage)
    .where(
      and(
        eq(pipelineStage.orgId, session.orgId),
        eq(pipelineStage.pipelineId, current.id),
      ),
    );
  const stageIds = stages.map((stage) => stage.id);

  const deals = await tx
    .select({ id: opportunity.id })
    .from(opportunity)
    .where(
      and(
        eq(opportunity.orgId, session.orgId),
        eq(opportunity.pipelineId, current.id),
      ),
    );
  const opportunityIds = deals.map((deal) => deal.id);

  if (stageIds.length || opportunityIds.length) {
    const conditions = [eq(opportunityStageHistory.orgId, session.orgId)];
    if (stageIds.length) {
      conditions.push(inArray(opportunityStageHistory.toStageId, stageIds));
    }
    if (opportunityIds.length) {
      conditions.push(inArray(opportunityStageHistory.opportunityId, opportunityIds));
    }

    await tx.delete(opportunityStageHistory).where(or(...conditions));
  }

  if (opportunityIds.length) {
    await tx
      .update(activityEvent)
      .set({ opportunityId: null })
      .where(
        and(
          eq(activityEvent.orgId, session.orgId),
          inArray(activityEvent.opportunityId, opportunityIds),
        ),
      );

    await tx
      .delete(opportunity)
      .where(
        and(
          eq(opportunity.orgId, session.orgId),
          inArray(opportunity.id, opportunityIds),
        ),
      );
  }

  await tx
    .delete(pipelineMember)
    .where(
      and(
        eq(pipelineMember.orgId, session.orgId),
        eq(pipelineMember.pipelineId, current.id),
      ),
    );

  if (stageIds.length) {
    await tx
      .delete(pipelineStage)
      .where(
        and(
          eq(pipelineStage.orgId, session.orgId),
          eq(pipelineStage.pipelineId, current.id),
        ),
      );
  }

  await tx
    .delete(pipeline)
    .where(and(eq(pipeline.id, current.id), eq(pipeline.orgId, session.orgId)));

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'pipeline.deleted',
    entityType: 'pipeline',
    entityId: current.id,
    changes: {
      name: current.name,
      deletedOpportunities: opportunityIds.length,
      deletedStages: stageIds.length,
    },
  });

  return {
    id: current.id,
    deletedOpportunities: opportunityIds.length,
    deletedStages: stageIds.length,
  };
}
