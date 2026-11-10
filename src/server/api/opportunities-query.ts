import { parseBoardFilters } from '@/domain/opportunities/filters';

export function parseOpportunitiesQuery(searchParams: URLSearchParams) {
  const filters = parseBoardFilters(searchParams);
  if (!filters.success) {
    return { ok: false as const };
  }
  return {
    ok: true as const,
    filters: filters.data,
    cursor: searchParams.get('cursor'),
    pipelineId: searchParams.get('pipeline'),
    stageId: searchParams.get('stageId'),
  };
}
