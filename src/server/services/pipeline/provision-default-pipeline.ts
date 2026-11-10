import 'server-only';

import { and, eq } from 'drizzle-orm';
import {
  DEFAULT_PIPELINE_NAME,
  DEFAULT_PIPELINE_SLUG,
  DEFAULT_PIPELINE_STAGES,
} from '@/domain/pipeline/default-stages';
import { writeAudit } from '@/server/audit/write';
import { membership, pipeline, pipelineMember, pipelineStage } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export type ProvisionDefaultPipelineResult = {
  pipelineId: string;
  created: boolean;
};

export async function provisionDefaultPipeline(
  tx: DbTransaction,
  session: TenantSession,
): Promise<ProvisionDefaultPipelineResult> {
  const [existing] = await tx
    .select()
    .from(pipeline)
    .where(
      and(
        eq(pipeline.orgId, session.orgId),
        eq(pipeline.isDefault, true),
      ),
    )
    .limit(1);

  if (existing) {
    return { pipelineId: existing.id, created: false };
  }

  const now = new Date();
  const [createdPipeline] = await tx
    .insert(pipeline)
    .values({
      orgId: session.orgId,
      name: DEFAULT_PIPELINE_NAME,
      slug: DEFAULT_PIPELINE_SLUG,
      position: 0,
      isDefault: true,
      createdBy: session.userId,
      updatedBy: session.userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: pipeline.id });

  if (!createdPipeline) {
    throw new Error('Failed to create default pipeline');
  }

  await tx.insert(pipelineStage).values(
    DEFAULT_PIPELINE_STAGES.map((stage) => ({
      orgId: session.orgId,
      pipelineId: createdPipeline.id,
      name: stage.name,
      kind: stage.kind,
      position: stage.position,
      probability: stage.probability,
      createdBy: session.userId,
      updatedBy: session.userId,
      createdAt: now,
      updatedAt: now,
    })),
  );

  const members = await tx
    .select({ userId: membership.userId })
    .from(membership)
    .where(eq(membership.orgId, session.orgId));

  if (members.length > 0) {
    await tx.insert(pipelineMember).values(
      members.map((member) => ({
        orgId: session.orgId,
        pipelineId: createdPipeline.id,
        userId: member.userId,
        createdBy: session.userId,
      })),
    );
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'onboarding.pipeline_provisioned',
    entityType: 'pipeline',
    entityId: createdPipeline.id,
    changes: { name: { to: DEFAULT_PIPELINE_NAME } },
  });

  return { pipelineId: createdPipeline.id, created: true };
}
