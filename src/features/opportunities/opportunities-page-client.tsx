'use client';

import { useCallback, useMemo, useState } from 'react';
import { useCreateDialog } from '@/components/create-dialog';
import { useRegisterOpportunityCreateContext } from '@/components/create-dialog/opportunity-create-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { BoardFilters } from '@/domain/opportunities/filters';
import type { PipelineListItem } from '@/domain/opportunities/card-view';
import { OpportunitiesBoard, NoPipelineAccess } from '@/features/opportunities/board/opportunities-board';
import { OpportunitiesToolbar } from '@/features/opportunities/components/opportunities-toolbar';
import { OpportunitiesList } from '@/features/opportunities/list/opportunities-list';
import type { OpportunityListQuery } from '@/domain/opportunities/list-query';
import type { ForecastQuery } from '@/domain/opportunities/forecast-query';
import { OpportunitiesForecast } from '@/features/opportunities/forecast/opportunities-forecast';
import { DealSheet } from '@/features/opportunities/components/deal-sheet';
import { opportunitiesKeys } from '@/features/opportunities/query-keys';
import { OpportunitiesPageHeader } from '@/features/opportunities/components/opportunities-page-header';
import { SavedViewsBar } from '@/features/opportunities/components/saved-views-bar';
import {
  captureFiltersFromUrl,
  filtersToSearchParams,
  type SavedViewListItem,
} from '@/domain/opportunities/saved-view';
import { ContentPanel } from '@/components/layouts/app-header';

async function fetchPipelines(): Promise<{ pipelines: PipelineListItem[] }> {
  const response = await fetch('/api/v1/pipelines');
  if (!response.ok) throw new Error('Failed to load pipelines');
  return response.json();
}

export function OpportunitiesPageClient({
  role,
  currentUserId,
  initialPipelines,
  defaultStageId,
}: {
  role: string;
  currentUserId: string;
  initialPipelines: PipelineListItem[];
  defaultStageId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openCreate } = useCreateDialog();
  const [focusedStageId, setFocusedStageId] = useState<string | null>(null);

  const view = (searchParams.get('view') as 'board' | 'list' | 'forecast') ?? 'board';
  const pipelineFromUrl = searchParams.get('pipeline');
  const dealId = searchParams.get('deal');
  const savedViewId = searchParams.get('saved');

  const filters: BoardFilters = useMemo(
    () => ({
      q: searchParams.get('q') || undefined,
      owner: (searchParams.get('owner') as BoardFilters['owner']) || 'all',
      status: (searchParams.get('status') as BoardFilters['status']) || 'open',
      sort: (searchParams.get('sort') as BoardFilters['sort']) || 'manual',
    }),
    [searchParams],
  );

  const forecastQuery: ForecastQuery = useMemo(
    () => ({
      q: searchParams.get('q') || undefined,
      owner: (searchParams.get('owner') as ForecastQuery['owner']) || 'all',
      close: (searchParams.get('close') as ForecastQuery['close']) || 'all',
    }),
    [searchParams],
  );

  const listQuery: OpportunityListQuery = useMemo(
    () => ({
      q: searchParams.get('q') || undefined,
      owner: (searchParams.get('owner') as OpportunityListQuery['owner']) || 'all',
      status: (searchParams.get('status') as OpportunityListQuery['status']) || 'open',
      sort: 'manual',
      listSort:
        (searchParams.get('listSort') as OpportunityListQuery['listSort']) || 'last_activity',
      listDir: (searchParams.get('listDir') as OpportunityListQuery['listDir']) || 'desc',
      limit: 25,
    }),
    [searchParams],
  );

  const { data: pipelineData } = useQuery({
    queryKey: opportunitiesKeys.pipelines(),
    queryFn: fetchPipelines,
    initialData: { pipelines: initialPipelines },
  });

  const pipelines = pipelineData.pipelines;
  const pipelineId =
    pipelineFromUrl && pipelines.some((item) => item.id === pipelineFromUrl)
      ? pipelineFromUrl
      : (pipelines.find((item) => item.isDefault)?.id ?? pipelines[0]?.id ?? null);

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      router.replace(`/opportunities?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const boardSummaryQuery = useQuery({
    queryKey: pipelineId ? opportunitiesKeys.boardSummary(pipelineId, filters) : ['noop'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.q) params.set('q', filters.q);
      if (filters.owner) params.set('owner', filters.owner);
      if (filters.status) params.set('status', filters.status);
      const response = await fetch(
        `/api/v1/pipelines/${pipelineId}/board-summary?${params.toString()}`,
      );
      if (!response.ok) throw new Error('Failed');
      return response.json();
    },
    enabled: Boolean(pipelineId),
  });

  const openAddOpportunity = useCallback(
    (stageId?: string) => {
      if (!pipelineId) return;
      const resolvedStage = stageId || defaultStageId || undefined;
      openCreate('opportunity', {
        pipelineId,
        ...(resolvedStage ? { stageId: resolvedStage } : {}),
      });
    },
    [defaultStageId, openCreate, pipelineId],
  );

  const opportunityRegisterCtx = useMemo(
    () =>
      pipelineId
        ? {
            pipelineId,
            focusedStageId,
            fallbackStageId: defaultStageId,
            view,
          }
        : null,
    [defaultStageId, focusedStageId, pipelineId, view],
  );
  useRegisterOpportunityCreateContext(opportunityRegisterCtx);

  if (pipelines.length === 0) {
    return (
      <ContentPanel className="pb-28">
        <NoPipelineAccess role={role} />
      </ContentPanel>
    );
  }

  return (
    <ContentPanel className="flex min-h-0 flex-col gap-3.5 pb-28">
      <OpportunitiesPageHeader
        pipelines={pipelines}
        pipelineId={pipelineId ?? ''}
        view={view}
        canCreatePipeline={role === 'admin'}
        onPipelineChange={(id) => updateParams({ pipeline: id })}
        onViewChange={(next) => updateParams({ view: next === 'board' ? null : next })}
        onAddOpportunity={() => openAddOpportunity()}
      />

      {pipelineId ? (
      <SavedViewsBar
        pipelineId={pipelineId}
        scope={view}
        activeSavedViewId={savedViewId}
        canShareWithTeam={role === 'admin' || role === 'manager'}
        onApplyDefault={() =>
          updateParams({
            saved: null,
            q: null,
            owner: null,
            status: null,
            sort: null,
            listSort: null,
            listDir: null,
            close: null,
          })
        }
        onApplyView={(viewItem: SavedViewListItem) => {
          updateParams({ saved: viewItem.id, ...filtersToSearchParams(viewItem.filters) });
        }}
        captureFilters={() => captureFiltersFromUrl(searchParams)}
      />
      ) : null}

      <OpportunitiesToolbar
        view={view}
        filters={filters}
        listQuery={listQuery}
        forecastQuery={forecastQuery}
        totals={boardSummaryQuery.data?.totals}
        onFiltersChange={(next) => {
          updateParams({
            q: next.q ?? null,
            owner: next.owner && next.owner !== 'all' ? next.owner : null,
            status: next.status && next.status !== 'open' ? next.status : null,
            sort: next.sort && next.sort !== 'manual' ? next.sort : null,
          });
        }}
        onListQueryChange={(next) => {
          updateParams({
            q: next.q ?? null,
            owner: next.owner && next.owner !== 'all' ? next.owner : null,
            status: next.status && next.status !== 'open' ? next.status : null,
            listSort: next.listSort && next.listSort !== 'last_activity' ? next.listSort : null,
            listDir: next.listDir && next.listDir !== 'desc' ? next.listDir : null,
          });
        }}
        onForecastQueryChange={(next) => {
          updateParams({
            q: next.q ?? null,
            owner: next.owner && next.owner !== 'all' ? next.owner : null,
            close: next.close && next.close !== 'all' ? next.close : null,
          });
        }}
      />

      {view === 'board' && pipelineId ? (
        <OpportunitiesBoard
          pipelineId={pipelineId}
          filters={filters}
          onOpenDeal={(id) => updateParams({ deal: id })}
          onAddDeal={(stageId) => openAddOpportunity(stageId)}
          onFocusStage={(stageId) => setFocusedStageId(stageId)}
          onClearFilters={() =>
            updateParams({ q: null, owner: null, status: null })
          }
        />
      ) : null}

      {view === 'list' && pipelineId ? (
        <OpportunitiesList
          pipelineId={pipelineId}
          listQuery={listQuery}
          onOpenDeal={(id) => updateParams({ deal: id })}
          onClearFilters={() =>
            updateParams({
              q: null,
              owner: null,
              status: null,
              listSort: null,
              listDir: null,
            })
          }
        />
      ) : null}

      {view === 'forecast' && pipelineId ? (
        <OpportunitiesForecast
          pipelineId={pipelineId}
          forecastQuery={forecastQuery}
          onClearFilters={() =>
            updateParams({ q: null, owner: null, close: null })
          }
          onOpenStage={() => updateParams({ view: 'board' })}
        />
      ) : null}

      <DealSheet
        dealId={dealId}
        open={Boolean(dealId)}
        filters={filters}
        listNav={view === 'list' ? listQuery : null}
        currentUserId={currentUserId}
        onOpenChange={(open) => {
          if (!open) updateParams({ deal: null });
        }}
        onNavigateDeal={(id) => updateParams({ deal: id })}
      />
    </ContentPanel>
  );
}
