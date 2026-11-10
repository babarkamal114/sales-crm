'use client';

import { useCallback } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import type { BoardFilters } from '@/domain/opportunities/filters';
import type { OpportunityCardView, PipelineStageView } from '@/domain/opportunities/card-view';
import { positionBetween } from '@/domain/opportunities/rules';
import { toast } from '@/components/ui/sonner';
import { moveOpportunityAction } from '@/server/actions/opportunities/move-opportunity';
import {
  patchMoveInCache,
  readStageCards,
  restoreStageCaches,
  snapshotStageCaches,
} from '@/features/opportunities/board/board-cache-patch';
import { applyAffected } from '@/lib/entities/invalidate';
import { opportunitiesKeys } from '@/features/opportunities/query-keys';

export type MoveIntent = {
  card: OpportunityCardView;
  fromStageId: string;
  toStageId: string;
  toStageName: string;
  insertBeforeCardId?: string | null;
  lostReasonId?: string;
  lostNote?: string;
};

function computePosition(
  queryClient: QueryClient,
  pipelineId: string,
  filters: BoardFilters,
  toStageId: string,
  movingCardId: string,
  insertBeforeCardId?: string | null,
): string {
  const cards = readStageCards(queryClient, pipelineId, toStageId, filters).filter(
    (item) => item.id !== movingCardId,
  );
  if (!insertBeforeCardId) {
    const last = cards[cards.length - 1];
    return positionBetween(last?.position ?? null, null);
  }
  const index = cards.findIndex((item) => item.id === insertBeforeCardId);
  if (index === -1) {
    const last = cards[cards.length - 1];
    return positionBetween(last?.position ?? null, null);
  }
  const before = index > 0 ? cards[index - 1]!.position : null;
  const after = cards[index]!.position;
  return positionBetween(before, after);
}

export function useExecuteMove({
  pipelineId,
  filters,
  stages,
}: {
  pipelineId: string;
  filters: BoardFilters;
  stages: PipelineStageView[];
}) {
  const queryClient = useQueryClient();

  const invalidateBoard = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: opportunitiesKeys.all });
  }, [queryClient]);

  const executeMove = useCallback(
    async (intent: MoveIntent, options?: { optimistic?: boolean; announce?: (msg: string) => void }) => {
      const { card, fromStageId, toStageId, toStageName } = intent;
      if (fromStageId === toStageId && !intent.insertBeforeCardId) {
        return { ok: true as const };
      }

      const targetStage = stages.find((item) => item.id === toStageId);
      const position = computePosition(
        queryClient,
        pipelineId,
        filters,
        toStageId,
        card.id,
        intent.insertBeforeCardId,
      );

      const stageIds = stages.map((item) => item.id);
      const snapshot =
        options?.optimistic !== false
          ? snapshotStageCaches(queryClient, pipelineId, stageIds, filters)
          : null;

      if (snapshot) {
        patchMoveInCache(queryClient, pipelineId, filters, fromStageId, toStageId, card.id, {
          position,
          version: card.version,
          status:
            targetStage?.kind === 'won' ? 'won' : targetStage?.kind === 'lost' ? 'lost' : 'open',
        });
      }

      const result = await moveOpportunityAction({
        opportunityId: card.id,
        stageId: toStageId,
        position,
        version: card.version,
        ...(intent.lostReasonId ? { lostReasonId: intent.lostReasonId } : {}),
        ...(intent.lostNote ? { lostNote: intent.lostNote } : {}),
      });

      if (!result.ok) {
        if (snapshot) restoreStageCaches(queryClient, pipelineId, filters, snapshot);
        if (result.error.code === 'CONFLICT') {
          toast.error('Someone else moved this deal.');
          invalidateBoard();
        } else {
          toast.error(result.error.message);
        }
        return { ok: false as const, error: result.error };
      }

      options?.announce?.(`Moved ${card.name} to ${toStageName}.`);

      toast.success(`Moved to ${toStageName}`, {
        duration: 6000,
        action: {
          label: 'Undo',
          onClick: () => {
            void (async () => {
              const undoResult = await moveOpportunityAction({
                opportunityId: card.id,
                stageId: fromStageId,
                position: card.position,
                version: result.data.version,
              });
              if (!undoResult.ok) {
                toast.error(undoResult.error.message);
                invalidateBoard();
                return;
              }
              toast.message('Move undone');
              invalidateBoard();
            })();
          },
        },
      });

      if (result.affected?.length) {
        applyAffected(queryClient, result.affected);
      } else {
        invalidateBoard();
      }
      return { ok: true as const };
    },
    [filters, invalidateBoard, pipelineId, queryClient, stages],
  );

  return { executeMove, invalidateBoard };
}
