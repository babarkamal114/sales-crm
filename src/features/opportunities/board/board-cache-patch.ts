import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { BoardFilters } from '@/domain/opportunities/filters';
import type { OpportunityCardView } from '@/domain/opportunities/card-view';
import { opportunitiesKeys } from '@/features/opportunities/query-keys';

type StageCardsPage = {
  items: OpportunityCardView[];
  nextCursor: string | null;
};

function stageKey(pipelineId: string, stageId: string, filters: BoardFilters) {
  return opportunitiesKeys.stageCards(pipelineId, stageId, filters);
}

export function readStageCards(
  queryClient: QueryClient,
  pipelineId: string,
  stageId: string,
  filters: BoardFilters,
): OpportunityCardView[] {
  const data = queryClient.getQueryData<InfiniteData<StageCardsPage>>(
    stageKey(pipelineId, stageId, filters),
  );
  return data?.pages.flatMap((page) => page.items) ?? [];
}

export function setStageCards(
  queryClient: QueryClient,
  pipelineId: string,
  stageId: string,
  filters: BoardFilters,
  cards: OpportunityCardView[],
) {
  queryClient.setQueryData<InfiniteData<StageCardsPage>>(stageKey(pipelineId, stageId, filters), {
    pages: [{ items: cards, nextCursor: null }],
    pageParams: [undefined],
  });
}

export function patchMoveInCache(
  queryClient: QueryClient,
  pipelineId: string,
  filters: BoardFilters,
  fromStageId: string,
  toStageId: string,
  cardId: string,
  patch: Partial<OpportunityCardView>,
) {
  const fromCards = readStageCards(queryClient, pipelineId, fromStageId, filters);
  const card = fromCards.find((item) => item.id === cardId);
  if (!card) return;

  const nextCard = { ...card, ...patch };
  setStageCards(
    queryClient,
    pipelineId,
    fromStageId,
    filters,
    fromCards.filter((item) => item.id !== cardId),
  );

  const toCards = readStageCards(queryClient, pipelineId, toStageId, filters);
  const merged = [...toCards.filter((item) => item.id !== cardId), nextCard].sort((a, b) =>
    a.position.localeCompare(b.position),
  );
  setStageCards(queryClient, pipelineId, toStageId, filters, merged);
}

export function snapshotStageCaches(
  queryClient: QueryClient,
  pipelineId: string,
  stageIds: string[],
  filters: BoardFilters,
) {
  const snapshot = new Map<string, InfiniteData<StageCardsPage> | undefined>();
  for (const stageId of stageIds) {
    snapshot.set(
      stageId,
      queryClient.getQueryData<InfiniteData<StageCardsPage>>(
        stageKey(pipelineId, stageId, filters),
      ),
    );
  }
  return snapshot;
}

export function restoreStageCaches(
  queryClient: QueryClient,
  pipelineId: string,
  filters: BoardFilters,
  snapshot: Map<string, InfiniteData<StageCardsPage> | undefined>,
) {
  for (const [stageId, data] of snapshot) {
    queryClient.setQueryData(stageKey(pipelineId, stageId, filters), data);
  }
}
