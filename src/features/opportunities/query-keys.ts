import type { BoardFilters } from '@/domain/opportunities/filters';
import type { OpportunityListQuery } from '@/domain/opportunities/list-query';
import type { ForecastQuery } from '@/domain/opportunities/forecast-query';
import { qk } from '@/lib/query-keys';

/** @deprecated Import `qk.opportunities` from `@/lib/query-keys` for new code. */
export const opportunitiesKeys = {
  all: qk.opportunities.all,
  pipelines: qk.opportunities.pipelines,
  boardSummary: qk.opportunities.boardSummary,
  stageCards: qk.opportunities.stageCards,
  detail: (opportunityId: string, filters: BoardFilters) =>
    qk.opportunities.detail(opportunityId, filters),
  list: (pipelineId: string, query: OpportunityListQuery) =>
    qk.opportunities.list(pipelineId, query),
  forecast: (pipelineId: string, query: ForecastQuery) =>
    [...qk.opportunities.all, 'forecast', pipelineId, query] as const,
  savedViews: (pipelineId: string, scope: 'board' | 'list') =>
    [...qk.opportunities.all, 'saved-views', pipelineId, scope] as const,
};
