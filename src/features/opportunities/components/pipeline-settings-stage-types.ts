import type { DefaultPipelineStage } from '@/domain/pipeline/default-stages';

export type EditablePipelineStage = DefaultPipelineStage & {
  id: string;
  rottingDays: number | null;
  version: number;
};
