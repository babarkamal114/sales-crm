export type DefaultPipelineStage = {
  name: string;
  kind: 'open' | 'won' | 'lost';
  position: number;
  probability: number | null;
};

export const DEFAULT_PIPELINE_NAME = 'Sales pipeline';
export const DEFAULT_PIPELINE_SLUG = 'sales';

export const DEFAULT_PIPELINE_STAGES: DefaultPipelineStage[] = [
  { name: 'New lead', kind: 'open', position: 0, probability: 10 },
  { name: 'Contacted', kind: 'open', position: 1, probability: 20 },
  { name: 'Interested', kind: 'open', position: 2, probability: 35 },
  { name: 'Discovery call', kind: 'open', position: 3, probability: 50 },
  { name: 'Proposal sent', kind: 'open', position: 4, probability: 70 },
  { name: 'Won', kind: 'won', position: 5, probability: 100 },
  { name: 'Lost', kind: 'lost', position: 6, probability: 0 },
];
