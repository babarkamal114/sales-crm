'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { OpportunityCardView } from '@/domain/opportunities/card-view';
import { BoardCard } from '@/features/opportunities/board/board-card';
import { useBoardDnd } from '@/features/opportunities/board/board-dnd-provider';
import { cn } from '@/lib/utils';

function mergeRefs<T>(...refs: Array<(node: T | null) => void>) {
  return (node: T | null) => {
    for (const ref of refs) ref(node);
  };
}

export function DraggableBoardCard({
  card,
  stageId,
  onOpen,
}: {
  card: OpportunityCardView;
  stageId: string;
  onOpen: (id: string) => void;
}) {
  const { dragEnabled, activeCardId, stages, requestMoveToStage } = useBoardDnd();

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    disabled: !dragEnabled,
    data: { type: 'card', card, stageId },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `before:${card.id}`,
    data: { type: 'card', stageId, cardId: card.id },
  });

  return (
    <div
      ref={mergeRefs(setNodeRef, setDropRef)}
      className={cn('relative pb-2.5', isOver && dragEnabled && 'z-[1]')}
    >
      {isOver && dragEnabled ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-16 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/60"
          aria-hidden
        />
      ) : null}
      <BoardCard
        card={card}
        onOpen={onOpen}
        stages={stages}
        currentStageId={stageId}
        onMoveToStage={(toStageId) => requestMoveToStage(card, stageId, toStageId)}
        isDragging={isDragging || activeCardId === card.id}
        {...(dragEnabled ? { dragHandleProps: { ...attributes, ...listeners } } : {})}
        onKeyboardMove={(direction) => {
          const index = stages.findIndex((item) => item.id === stageId);
          const next = stages[index + (direction === 'right' ? 1 : -1)];
          if (next) requestMoveToStage(card, stageId, next.id);
        }}
      />
    </div>
  );
}
