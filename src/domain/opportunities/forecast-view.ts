export type ForecastStageRow = {
  stageId: string;
  stageName: string;
  position: number;
  probability: number | null;
  dealCount: number;
  totalValuePence: number;
  weightedValuePence: number;
};

export type PipelineForecastView = {
  closeWindow: 'all' | '30d' | '90d' | 'month';
  closeWindowLabel: string;
  totals: {
    dealCount: number;
    openValuePence: number;
    weightedValuePence: number;
  };
  stages: ForecastStageRow[];
};
