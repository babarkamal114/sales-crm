'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { BoardFilters } from '@/domain/opportunities/filters';
import type { OpportunityCardView, PipelineStageView } from '@/domain/opportunities/card-view';
import { BoardCard } from '@/features/opportunities/board/board-card';
import { MarkLostDialog } from '@/features/opportunities/components/mark-lost-dialog';
import { toast } from '@/components/ui/sonner';
import type { MoveIntent } from '@/features/opportunities/board/use-execute-move';
import { useExecuteMove } from '@/features/opportunities/board/use-execute-move';

type BoardDndContextValue = {
  dragEnabled: boolean;
  activeCardId: string | null;
  stages: PipelineStageView[];
  requestMoveToStage: (
    card: OpportunityCardView,
    fromStageId: string,
    toStageId: string,
    insertBeforeCardId?: string | null,
  ) => void;
};

const BoardDndContext = createContext<BoardDndContextValue | null>(null);

export function useBoardDnd() {
  const ctx = useContext(BoardDndContext);
  if (!ctx) {
    throw new Error('useBoardDnd must be used within BoardDndProvider');
  }
  return ctx;
}

export function BoardDndProvider({
  pipelineId,
  filters,
  stages,
  children,
}: {
  pipelineId: string;
  filters: BoardFilters;
  stages: PipelineStageView[];
  children: ReactNode;
}) {
  const dragEnabled = (filters.sort ?? 'manual') === 'manual';
  const [activeCard, setActiveCard] = useState<{
    card: OpportunityCardView;
    stageId: string;
  } | null>(null);
  const [lostDialog, setLostDialog] = useState<MoveIntent | null>(null);
  const [lostConfirming, setLostConfirming] = useState(false);
  const lostClosedByConfirmRef = useRef(false);
  const liveRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string) => {
    if (liveRef.current) liveRef.current.textContent = message;
  }, []);

  const { executeMove } = useExecuteMove({ pipelineId, filters, stages });

  const runMove = useCallback(
    async (intent: MoveIntent, optimistic = true) => {
      const target = stages.find((item) => item.id === intent.toStageId);
      if (target?.kind === 'lost') {
        setLostDialog(intent);
        return;
      }
      await executeMove(intent, { optimistic, announce });
    },
    [announce, executeMove, stages],
  );

  const requestMoveToStage = useCallback(
    (
      card: OpportunityCardView,
      fromStageId: string,
      toStageId: string,
      insertBeforeCardId?: string | null,
    ) => {
      if (!dragEnabled) {
        toast.message('Switch sort to Manual to drag deals');
        return;
      }
      if (fromStageId === toStageId && insertBeforeCardId === card.id) return;

      const toStageName = stages.find((item) => item.id === toStageId)?.name ?? 'stage';
      void runMove({
        card,
        fromStageId,
        toStageId,
        toStageName,
        insertBeforeCardId: insertBeforeCardId ?? null,
      });
    },
    [dragEnabled, runMove, stages],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (!data || data.type !== 'card') return;
    setActiveCard({ card: data.card as OpportunityCardView, stageId: data.stageId as string });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null);
    if (!dragEnabled) return;

    const { active, over } = event;
    if (!over || !active.data.current) return;

    const card = active.data.current.card as OpportunityCardView;
    const fromStageId = active.data.current.stageId as string;

    let toStageId = fromStageId;
    let insertBeforeCardId: string | null = null;

    const overId = String(over.id);
    const overData = over.data.current;
    if (overData?.type === 'column' || overId.startsWith('column:')) {
      toStageId = (overData?.stageId as string) ?? overId.replace(/^column:/, '');
    } else if (overData?.type === 'card' || overId.startsWith('before:')) {
      toStageId = overData?.stageId as string;
      insertBeforeCardId = (overData?.cardId as string) ?? overId.replace(/^before:/, '');
      if (insertBeforeCardId === card.id) return;
    } else {
      return;
    }

    if (fromStageId === toStageId && !insertBeforeCardId) return;

    requestMoveToStage(card, fromStageId, toStageId, insertBeforeCardId);
  };

  const handleDragCancel = () => setActiveCard(null);

  const value = useMemo(
    () => ({
      dragEnabled,
      activeCardId: activeCard?.card.id ?? null,
      stages,
      requestMoveToStage,
    }),
    [activeCard?.card.id, dragEnabled, requestMoveToStage, stages],
  );

  return (
    <BoardDndContext.Provider value={value}>
      <div ref={liveRef} className="sr-only" aria-live="polite" aria-atomic="true" />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        autoScroll
      >
        {children}
        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div className="rotate-[1deg] scale-[1.02] opacity-95">
              <BoardCard card={activeCard.card} onOpen={() => {}} dragOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <MarkLostDialog
        open={Boolean(lostDialog)}
        card={lostDialog?.card ?? null}
        confirming={lostConfirming}
        onOpenChange={(open) => {
          if (!open) {
            if (!lostClosedByConfirmRef.current) {
              toast.message('Deal kept in its current stage');
            }
            lostClosedByConfirmRef.current = false;
            setLostDialog(null);
          }
        }}
        onConfirm={async (payload) => {
          if (!lostDialog) return;
          setLostConfirming(true);
          try {
            lostClosedByConfirmRef.current = true;
            await executeMove(
              {
                ...lostDialog,
                lostReasonId: payload.lostReasonId,
                ...(payload.lostNote ? { lostNote: payload.lostNote } : {}),
              },
              { optimistic: false, announce },
            );
            setLostDialog(null);
          } finally {
            setLostConfirming(false);
          }
        }}
      />
    </BoardDndContext.Provider>
  );
}
