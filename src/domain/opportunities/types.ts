export type OpportunityStatus = 'open' | 'won' | 'lost';

export type PipelineStageKind = 'open' | 'won' | 'lost';

export type DealForRules = {
  pipelineId: string;
  stageId: string;
  status: OpportunityStatus;
};

export type StageForRules = {
  id: string;
  pipelineId: string;
  kind: PipelineStageKind;
  /** 0–100 for open stages; null treated as 0 in effectiveProbability when open. */
  probability: number | null;
  rottingDays: number | null;
};

export type DealTimingForRules = {
  stageEnteredAt: Date;
  lastActivityAt: Date | null;
};

export type DealValueForRules = {
  valuePence: number;
  probabilityOverride: number | null;
};
