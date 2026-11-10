'use client';

import { useCallback, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useInfiniteQuery } from '@tanstack/react-query';
import { MoreHorizontal, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BoardFilters } from '@/domain/opportunities/filters';
import type { PipelineStageView } from '@/domain/opportunities/card-view';
import { BoardCard } from '@/features/opportunities/board/board-card';
import { DraggableBoardCard } from '@/features/opportunities/board/draggable-board-card';
import { useBoardDnd } from '@/features/opportunities/board/board-dnd-provider';
import { opportunitiesKeys } from '@/features/opportunities/query-keys';
import { formatOpportunityValue } from '@/features/opportunities/lib/format-money';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

async function fetchStageCards(
  pipelineId: string,
  stageId: string,
  filters: BoardFilters,
  cursor?: string,
) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.owner) params.set('owner', filters.owner);
  if (filters.status) params.set('status', filters.status);
  if (cursor) params.set('cursor', cursor);

  const response = await fetch(
    `/api/v1/pipelines/${pipelineId}/stages/${stageId}/opportunities?${params.toString()}`,
  );
  if (!response.ok) throw new Error('Failed to load deals');
  return response.json() as Promise<{
    items: import('@/domain/opportunities/card-view').OpportunityCardView[];
    nextCursor: string | null;
  }>;
}

export function BoardColumn({
  pipelineId,
  stage,
  filters,
  summary,
  onOpenDeal,
  onAddDeal,
  onFocusStage,
}: {
  pipelineId: string;
  stage: PipelineStageView;
  filters: BoardFilters;
  summary: { count: number; totalValuePence: number; probability: number | null };
  onOpenDeal: (id: string) => void;
  onAddDeal: (stageId: string) => void;
  onFocusStage?: (stageId: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { dragEnabled } = useBoardDnd();

  const { setNodeRef: setColumnDropRef, isOver: columnOver } = useDroppable({
    id: `column:${stage.id}`,
    data: { type: 'column', stageId: stage.id },
  });

  const setScrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      parentRef.current = node;
      setColumnDropRef(node);
    },
    [setColumnDropRef],
  );

  const query = useInfiniteQuery({
    queryKey: opportunitiesKeys.stageCards(pipelineId, stage.id, filters),
    queryFn: ({ pageParam }) =>
      fetchStageCards(pipelineId, stage.id, filters, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const cards = query.data?.pages.flatMap((page) => page.items) ?? [];

  const virtualizer = useVirtualizer({
    count: cards.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 148,
    overscan: 4,
  });

  const barColour =
    stage.kind === 'won' ? 'bg-mint-500' : stage.kind === 'lost' ? 'bg-rose-500' : 'bg-brand-500';

  const likelyLabel =
    stage.kind === 'open' && stage.probability != null ? `${stage.probability}% likely` : null;

  return (
    <section
      className={cn(
        'flex w-[288px] shrink-0 snap-start flex-col rounded-[20px] border border-white/70 bg-white/55 shadow-[0_1px_2px_rgba(25,29,40,0.04)] backdrop-blur-[18px] transition-[background,border-color] duration-100',
        columnOver && dragEnabled && 'border-brand-300 bg-brand-50/85',
      )}
      data-kind={stage.kind}
      data-board-stage-id={stage.id}
      aria-label={`${stage.name}, ${summary.count} deals`}
      onFocusCapture={() => onFocusStage?.(stage.id)}
      tabIndex={-1}
    >
      <header className="px-3.5 pb-2.5 pt-3.5">
        <div className="flex items-center gap-2">
          <span className={cn('h-4 w-1 rounded-full', barColour)} aria-hidden />
          <h2 className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink-900">
            {stage.name}
          </h2>
          <span className="num rounded-full border border-line bg-white px-2 text-[12px] font-semibold leading-5 text-ink-700">
            {summary.count}
          </span>
          {stage.kind === 'open' ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-white"
                  aria-label={`${stage.name} column options`}
                >
                  <MoreHorizontal className="size-4" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onSelect={() => onAddDeal(stage.id)}>Add deal</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
        <p className="mt-1 pl-3 text-[13px] text-ink-500">
          <b className="num font-bold text-ink-900">
            {formatOpportunityValue(summary.totalValuePence)}
          </b>
          {likelyLabel ? ` · ${likelyLabel}` : null}
        </p>
      </header>

      <div ref={setScrollRef} className="min-h-[280px] flex-1 overflow-y-auto px-2.5 pb-2.5">
        {query.isLoading ? (
          <p className="px-2 py-6 text-center text-[12px] font-medium text-ink-500">Loading…</p>
        ) : cards.length === 0 ? (
          columnOver && dragEnabled ? (
            <div className="mx-0.5 flex h-16 items-center justify-center rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/60 text-[12px] font-semibold text-brand-700">
              Drop here
            </div>
          ) : (
            <p className="px-2 py-8 text-center text-[13px] font-medium text-ink-500">
              No deals in this stage
            </p>
          )
        ) : (
          <div
            style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
            className="w-full"
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const card = cards[virtualRow.index];
              if (!card) return null;
              return (
                <div
                  key={card.id}
                  className="absolute left-0 w-full"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  {dragEnabled ? (
                    <DraggableBoardCard card={card} stageId={stage.id} onOpen={onOpenDeal} />
                  ) : (
                    <div className="pb-2.5">
                      <BoardCard card={card} onOpen={onOpenDeal} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {query.hasNextPage ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 w-full"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        ) : null}
      </div>

      {stage.kind === 'open' ? (
        <button
          type="button"
          className="mx-2.5 mb-3 flex h-[38px] shrink-0 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-ink-300 text-[13px] font-semibold text-ink-500 hover:border-brand-500 hover:bg-white hover:text-brand-600"
          onClick={() => onAddDeal(stage.id)}
        >
          <Plus className="size-3.5" aria-hidden />
          Add deal
        </button>
      ) : null}
    </section>
  );
}
