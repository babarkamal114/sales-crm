'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { BoardFilters } from '@/domain/opportunities/filters';
import { boardFiltersActive } from '@/domain/opportunities/filters';
import { BoardColumn } from '@/features/opportunities/board/board-column';
import { BoardDndProvider } from '@/features/opportunities/board/board-dnd-provider';
import { opportunitiesKeys } from '@/features/opportunities/query-keys';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

async function fetchBoardSummary(pipelineId: string, filters: BoardFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.owner) params.set('owner', filters.owner);
  if (filters.status) params.set('status', filters.status);
  const response = await fetch(
    `/api/v1/pipelines/${pipelineId}/board-summary?${params.toString()}`,
  );
  if (!response.ok) throw new Error('Failed to load board');
  return response.json() as Promise<{
    stages: import('@/domain/opportunities/card-view').PipelineStageView[];
    summaries: import('@/domain/opportunities/card-view').BoardStageSummary[];
    totals: { openValuePence: number; weightedValuePence: number; dealCount: number };
  }>;
}

export function OpportunitiesBoard({
  pipelineId,
  filters,
  onOpenDeal,
  onAddDeal,
  onFocusStage,
  onClearFilters,
}: {
  pipelineId: string;
  filters: BoardFilters;
  onOpenDeal: (id: string) => void;
  onAddDeal: (stageId: string) => void;
  onFocusStage?: (stageId: string) => void;
  onClearFilters: () => void;
}) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: opportunitiesKeys.boardSummary(pipelineId, filters),
    queryFn: () => fetchBoardSummary(pipelineId, filters),
  });

  const summaryByStage = useMemo(() => {
    const map = new Map<string, { count: number; totalValuePence: number; probability: number | null }>();
    for (const stage of data?.stages ?? []) {
      const summary = data?.summaries.find((item) => item.stageId === stage.id);
      map.set(stage.id, {
        count: summary?.count ?? 0,
        totalValuePence: summary?.totalValuePence ?? 0,
        probability: stage.probability,
      });
    }
    return map;
  }, [data]);

  if (isLoading) {
    return (
      <div className="rounded-xl2 border border-line/60 bg-white p-10 text-center text-[13px] font-medium text-ink-500">
        Loading board…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl2 border border-rose-200 bg-rose-50/80 p-8 text-center">
        <p className="text-[14px] font-bold text-rose-800">Could not load the board</p>
        <Button type="button" className="mt-3" variant="secondary" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const hasDeals = data.totals.dealCount > 0;
  const filtersActive = boardFiltersActive(filters);

  if (!hasDeals && !filtersActive) {
    return (
      <div className="rounded-xl2 border border-line/60 bg-white px-6 py-12 text-center shadow-panel">
        <p className="text-[17px] font-extrabold text-ink-900">No deals in this pipeline yet</p>
        <p className="mx-auto mt-2 max-w-md text-[13px] font-medium leading-relaxed text-ink-500">
          Add your first opportunity or import leads from Getting started to populate the board.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={() => onAddDeal(data.stages[0]?.id ?? '')}>
            Add opportunity
          </Button>
          <Button asChild variant="secondary">
            <Link href="/getting-started">Import leads</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!hasDeals && filtersActive) {
    return (
      <div className="rounded-xl2 border border-line/60 bg-white px-6 py-12 text-center shadow-panel">
        <p className="text-[17px] font-extrabold text-ink-900">No deals match these filters</p>
        <Button type="button" className="mt-4" variant="secondary" onClick={onClearFilters}>
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <BoardDndProvider pipelineId={pipelineId} filters={filters} stages={data.stages}>
      <div
        className="flex min-h-[420px] flex-1 gap-3.5 overflow-x-auto overflow-y-hidden pb-2.5 snap-x snap-proximity"
        aria-label="Pipeline board. Drag deals between stages or use the card menu."
      >
        {data.stages.map((stage) => (
          <BoardColumn
            key={stage.id}
            pipelineId={pipelineId}
            stage={stage}
            filters={filters}
            summary={
              summaryByStage.get(stage.id) ?? {
                count: 0,
                totalValuePence: 0,
                probability: stage.probability,
              }
            }
            onOpenDeal={onOpenDeal}
            onAddDeal={onAddDeal}
            {...(onFocusStage ? { onFocusStage } : {})}
          />
        ))}
      </div>
    </BoardDndProvider>
  );
}

export function NoPipelineAccess({ role }: { role: string }) {
  return (
    <div className="rounded-xl2 border border-line/60 bg-white px-6 py-12 text-center shadow-panel">
      <p className="text-[17px] font-extrabold text-ink-900">No pipelines available</p>
      <p className="mx-auto mt-2 max-w-md text-[13px] font-medium text-ink-500">
        {role === 'admin'
          ? 'Create a pipeline in Settings to start tracking opportunities.'
          : 'Ask your admin to assign you to a pipeline.'}
      </p>
      {role === 'admin' ? (
        <Button asChild className="mt-4" variant="secondary">
          <Link href="/settings">Create pipeline</Link>
        </Button>
      ) : null}
    </div>
  );
}
