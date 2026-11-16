import 'server-only';

import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { ManagePipelineMembersInput } from '@/domain/pipeline/schemas';
import { assertCan, NotFoundError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import {
  membership,
  pipeline,
  pipelineMember,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export async function setPipelineMembers(
  tx: DbTransaction,
  session: TenantSession,
  input: ManagePipelineMembersInput,
): Promise<{ pipelineId: string; memberIds: string[]; added: string[]; removed: string[] }> {
  assertCan(session, 'settings.pipelines.manage');

  const [selectedPipeline] = await tx
    .select({ id: pipeline.id })
    .from(pipeline)
    .where(
      and(
        eq(pipeline.id, input.pipelineId),
        eq(pipeline.orgId, session.orgId),
        isNull(pipeline.archivedAt),
      ),
    )
    .limit(1);

  if (!selectedPipeline) {
    throw new NotFoundError('Pipeline not found.');
  }

  const targetIds = [...new Set(input.memberIds)];

  if (targetIds.length > 0) {
    const orgMembers = await tx
      .select({ userId: membership.userId })
      .from(membership)
      .where(
        and(
          eq(membership.orgId, session.orgId),
          inArray(membership.userId, targetIds),
        ),
      );

    if (orgMembers.length !== targetIds.length) {
      throw new NotFoundError('One or more organisation members were not found.');
    }
  }

  const existingRows = await tx
    .select({ userId: pipelineMember.userId })
    .from(pipelineMember)
    .where(
      and(
        eq(pipelineMember.orgId, session.orgId),
        eq(pipelineMember.pipelineId, selectedPipeline.id),
      ),
    );

  const existingIds = new Set(existingRows.map((row) => row.userId));
  const targetSet = new Set(targetIds);
  const added = targetIds.filter((id) => !existingIds.has(id));
  const removed = [...existingIds].filter((id) => !targetSet.has(id));

  if (added.length === 0 && removed.length === 0) {
    return {
      pipelineId: selectedPipeline.id,
      memberIds: targetIds,
      added,
      removed,
    };
  }

  if (removed.length > 0) {
    await tx
      .delete(pipelineMember)
      .where(
        and(
          eq(pipelineMember.orgId, session.orgId),
          eq(pipelineMember.pipelineId, selectedPipeline.id),
          inArray(pipelineMember.userId, removed),
        ),
      );
  }

  if (added.length > 0) {
    await tx.insert(pipelineMember).values(
      added.map((userId) => ({
        orgId: session.orgId,
        pipelineId: selectedPipeline.id,
        userId,
        createdBy: session.userId,
      })),
    );
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'pipeline.members_changed',
    entityType: 'pipeline',
    entityId: selectedPipeline.id,
    changes: {
      members: {
        added,
        removed,
      },
    },
  });

  return {
    pipelineId: selectedPipeline.id,
    memberIds: targetIds,
    added,
    removed,
  };
}