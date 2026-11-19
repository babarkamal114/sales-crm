import { DEFAULT_PIPELINE_COLOR } from '@/domain/pipeline/colors';
import type { EditablePipelineStage } from '@/features/opportunities/components/pipeline-settings-stage-types';
import type {
  PipelineSettingsData,
  PipelineSettingsDraft,
} from '@/features/opportunities/components/pipeline-settings-shared';

function sameIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((id, index) => id === sortedRight[index]);
}

function sameStage(left: EditablePipelineStage, right: EditablePipelineStage): boolean {
  return (
    left.id === right.id &&
    left.name === right.name &&
    left.kind === right.kind &&
    left.position === right.position &&
    left.probability === right.probability &&
    left.rottingDays === right.rottingDays &&
    left.version === right.version
  );
}

export function createPipelineSettingsDraft(
  data: PipelineSettingsData,
): PipelineSettingsDraft {
  return {
    name: data.name,
    slug: data.slug,
    color: data.color ?? DEFAULT_PIPELINE_COLOR,
    isDefault: data.isDefault,
    ownerId: data.createdBy,
    memberIds: data.members.map((member) => member.id).sort(),
    stages: data.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      kind: stage.kind,
      position: stage.position,
      probability: stage.probability,
      rottingDays: stage.rottingDays,
      version: stage.version,
    })),
  };
}

export function hasPipelineSettingsChanges(
  baseline: PipelineSettingsDraft,
  draft: PipelineSettingsDraft,
): boolean {
  if (
    baseline.name !== draft.name ||
    baseline.slug !== draft.slug ||
    baseline.color !== draft.color ||
    baseline.isDefault !== draft.isDefault ||
    baseline.ownerId !== draft.ownerId ||
    !sameIds(baseline.memberIds, draft.memberIds) ||
    baseline.stages.length !== draft.stages.length
  ) {
    return true;
  }

  return baseline.stages.some((stage, index) => !sameStage(stage, draft.stages[index]!));
}

export function buildPipelineSettingsPayload(
  pipelineId: string,
  version: number,
  draft: PipelineSettingsDraft,
) {
  return {
    pipelineId,
    version,
    name: draft.name.trim(),
    slug: draft.slug.trim(),
    color: (draft.color ?? DEFAULT_PIPELINE_COLOR).toUpperCase(),
    isDefault: draft.isDefault,
    ownerId: draft.ownerId,
    memberIds: [...new Set(draft.memberIds)].sort(),
    stages: [...draft.stages]
      .sort((left, right) => left.position - right.position)
      .map((stage) => ({
        id: stage.id,
        name: stage.name.trim(),
        kind: stage.kind,
        position: stage.position,
        probability: stage.probability,
        rottingDays: stage.rottingDays,
        version: stage.version,
      })),
  };
}
