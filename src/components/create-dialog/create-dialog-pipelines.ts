import type { PipelineListItem } from '@/domain/opportunities/card-view';
import type { CreateOpportunityPrefill } from '@/lib/entities/create-prefill';

export const LAST_PIPELINE_STORAGE_KEY = 'crm:lastPipelineId';

export async function fetchPipelinesForCreate(): Promise<{ pipelines: PipelineListItem[] }> {
  const response = await fetch('/api/v1/pipelines');
  if (!response.ok) throw new Error('Failed to load pipelines');
  return response.json() as Promise<{ pipelines: PipelineListItem[] }>;
}

export async function fetchFirstStageId(pipelineId: string): Promise<string | null> {
  const response = await fetch(`/api/v1/pipelines/${pipelineId}/create-meta`);
  if (!response.ok) return null;
  const data = (await response.json()) as { stages: { id: string }[] };
  return data.stages[0]?.id ?? null;
}

/** Picks pipeline from prefill, last-used local storage, default flag, or first list item. */
export function pickOpportunityPipelineId(
  prefill: CreateOpportunityPrefill,
  pipelines: PipelineListItem[],
): string {
  const fromPrefill = prefill.pipelineId;
  if (fromPrefill && pipelines.some((p) => p.id === fromPrefill)) return fromPrefill;

  if (typeof window !== 'undefined') {
    const last = window.localStorage.getItem(LAST_PIPELINE_STORAGE_KEY);
    if (last && pipelines.some((p) => p.id === last)) return last;
  }

  return pipelines.find((p) => p.isDefault)?.id ?? pipelines[0]?.id ?? '';
}
