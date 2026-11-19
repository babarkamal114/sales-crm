import 'server-only';

import { and, eq, inArray, isNull, ne } from 'drizzle-orm';
import { pipelineColorSchema, type UpdatePipelineSettingsInput } from '@/domain/pipeline/schemas';
import { assertCan, NotFoundError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import { membership, pipeline, pipelineStage } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { setPipelineMembers } from '@/server/services/pipeline/set-pipeline-members';

export class PipelineSlugTakenError extends Error {
  readonly code = 'SLUG_TAKEN' as const;

  constructor() {
    super('That pipeline slug is already in use.');
    this.name = 'PipelineSlugTakenError';
  }
}

export class PipelineSettingsValidationError extends Error {
  readonly code = 'VALIDATION_FAILED' as const;

  constructor(message: string) {
    super(message);
    this.name = 'PipelineSettingsValidationError';
  }
}

function versionConflict(): Error & { code: 'CONFLICT' } {
  const error = new Error('Someone else updated this pipeline.') as Error & {
    code: 'CONFLICT';
  };
  error.code = 'CONFLICT';
  return error;
}

export type UpdatePipelineSettingsResult = { id: string; version: number };

export async function updatePipelineSettings(
  tx: DbTransaction,
  session: TenantSession,
  input: UpdatePipelineSettingsInput,
): Promise<UpdatePipelineSettingsResult> {
  assertCan(session, 'settings.pipelines.manage');

  const [current] = await tx
    .select()
    .from(pipeline)
    .where(
      and(
        eq(pipeline.id, input.pipelineId),
        eq(pipeline.orgId, session.orgId),
        isNull(pipeline.archivedAt),
      ),
    )
    .limit(1);

  if (!current) {
    throw new NotFoundError('Pipeline not found.');
  }
  if (current.version !== input.version) {
    throw versionConflict();
  }

  const color = pipelineColorSchema.safeParse(input.color);
  if (!color.success) {
    throw new PipelineSettingsValidationError(
      color.error.issues[0]?.message ?? 'Enter a valid pipeline colour.',
    );
  }

  const changes: Record<string, unknown> = {};

  if (input.name !== current.name) {
    changes.name = { from: current.name, to: input.name };
  }

  if (input.slug !== current.slug) {
    const [taken] = await tx
      .select({ id: pipeline.id })
      .from(pipeline)
      .where(
        and(
          eq(pipeline.orgId, session.orgId),
          eq(pipeline.slug, input.slug),
          ne(pipeline.id, current.id),
        ),
      )
      .limit(1);

    if (taken) {
      throw new PipelineSlugTakenError();
    }
    changes.slug = { from: current.slug, to: input.slug };
  }

  if (color.data !== current.color) {
    changes.color = { from: current.color, to: color.data };
  }

  if (input.isDefault !== current.isDefault) {
    changes.isDefault = { from: current.isDefault, to: input.isDefault };
  }
  if (input.ownerId !== current.createdBy) {
    changes.ownerId = { from: current.createdBy, to: input.ownerId };
  }

  const targetMemberIds = [...new Set([...input.memberIds, input.ownerId])];

  const orgMembers = await tx
    .select({ userId: membership.userId })
    .from(membership)
    .where(
      and(
        eq(membership.orgId, session.orgId),
        inArray(membership.userId, targetMemberIds),
      ),
    );

  if (orgMembers.length !== targetMemberIds.length) {
    throw new NotFoundError('One or more organisation members were not found.');
  }

  const existingStages = await tx
    .select()
    .from(pipelineStage)
    .where(
      and(
        eq(pipelineStage.orgId, session.orgId),
        eq(pipelineStage.pipelineId, current.id),
        isNull(pipelineStage.archivedAt),
      ),
    );
  const stagesById = new Map(existingStages.map((stage) => [stage.id, stage]));

  if (
    input.stages.length !== existingStages.length ||
    input.stages.some((stage) => !stagesById.has(stage.id))
  ) {
    throw new NotFoundError('One or more pipeline stages were not found.');
  }

  const positions = input.stages.map((stage) => stage.position);
  if (
    new Set(positions).size !== positions.length ||
    positions.some((position) => position < 0 || position >= input.stages.length)
  ) {
    throw new PipelineSettingsValidationError(
      'Stage positions must be unique and sequential.',
    );
  }

  for (const stage of input.stages) {
    const existing = stagesById.get(stage.id)!;
    for (const field of ['name', 'kind', 'probability', 'rottingDays', 'position'] as const) {
      if (stage[field] !== existing[field]) {
        changes[`stages.${stage.id}.${field}`] = {
          from: existing[field],
          to: stage[field],
        };
      }
    }
  }

  const now = new Date();

  for (const [index, stage] of input.stages.entries()) {
    const [moved] = await tx
      .update(pipelineStage)
      .set({ position: -(index + 1) })
      .where(
        and(
          eq(pipelineStage.id, stage.id),
          eq(pipelineStage.orgId, session.orgId),
          eq(pipelineStage.pipelineId, current.id),
          eq(pipelineStage.version, stage.version),
        ),
      )
      .returning({ id: pipelineStage.id });

    if (!moved) {
      throw versionConflict();
    }
  }

  for (const stage of input.stages) {
    const existing = stagesById.get(stage.id)!;
    await tx
      .update(pipelineStage)
      .set({
        name: stage.name,
        kind: stage.kind,
        position: stage.position,
        probability: stage.kind === 'won' ? 100 : stage.kind === 'lost' ? 0 : stage.probability,
        rottingDays: stage.kind === 'open' ? stage.rottingDays : null,
        version: existing.version + 1,
        updatedAt: now,
        updatedBy: session.userId,
      })
      .where(
        and(
          eq(pipelineStage.id, stage.id),
          eq(pipelineStage.orgId, session.orgId),
          eq(pipelineStage.pipelineId, current.id),
        ),
      );
  }

  const memberResult = await setPipelineMembers(tx, session, {
    pipelineId: current.id,
    memberIds: targetMemberIds,
  });

  if (memberResult.added.length || memberResult.removed.length) {
    changes.members = {
      added: memberResult.added,
      removed: memberResult.removed,
    };
  }

  if (input.isDefault) {
    await tx
      .update(pipeline)
      .set({ isDefault: false, updatedAt: now, updatedBy: session.userId })
      .where(
        and(
          eq(pipeline.orgId, session.orgId),
          ne(pipeline.id, current.id),
          eq(pipeline.isDefault, true),
        ),
      );
  }

  const [updated] = await tx
    .update(pipeline)
    .set({
      name: input.name,
      slug: input.slug,
      color: color.data,
      isDefault: input.isDefault,
      createdBy: input.ownerId,
      version: current.version + 1,
      updatedAt: now,
      updatedBy: session.userId,
    })
    .where(
      and(
        eq(pipeline.id, current.id),
        eq(pipeline.orgId, session.orgId),
        eq(pipeline.version, current.version),
      ),
    )
    .returning({ id: pipeline.id, version: pipeline.version });

  if (!updated) {
    throw versionConflict();
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'pipeline.settings_updated',
    entityType: 'pipeline',
    entityId: current.id,
    changes,
  });

  return { id: updated.id, version: updated.version };
}
