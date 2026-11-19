'use client';

import { useRef } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortablePipelineStageRow } from '@/features/opportunities/components/pipeline-settings-sortable-stage-row';
import type { EditablePipelineStage } from '@/features/opportunities/components/pipeline-settings-stage-types';
import type { SettingsPanelProps } from '@/features/opportunities/components/pipeline-settings-shared';
import { FieldHelp } from '@/components/ui/field-help';

type PipelineStageSettingsProps = SettingsPanelProps & {
  stages: EditablePipelineStage[];
  onStagesChange: (stages: EditablePipelineStage[]) => void;
};

export function PipelineStageSettings({
  hidden,
  stages,
  onStagesChange,
}: PipelineStageSettingsProps) {
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function updateStage(stageId: string, updates: Partial<EditablePipelineStage>) {
    onStagesChange(
      stages.map((stage) => (stage.id === stageId ? { ...stage, ...updates } : stage)),
    );
  }

  function setRowRef(stageId: string, node: HTMLLIElement | null) {
    if (node) {
      rowRefs.current.set(stageId, node);
    } else {
      rowRefs.current.delete(stageId);
    }
  }

  function reorderStages(oldIndex: number, newIndex: number, animate = false) {
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex || newIndex >= stages.length) {
      return;
    }

    const previousTops = new Map<string, number>();
    if (animate) {
      rowRefs.current.forEach((node, stageId) => {
        previousTops.set(stageId, node.getBoundingClientRect().top);
      });
    }

    onStagesChange(
      arrayMove(stages, oldIndex, newIndex).map((stage, position) => ({
        ...stage,
        position,
      })),
    );

    if (
      !animate ||
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    requestAnimationFrame(() => {
      previousTops.forEach((previousTop, stageId) => {
        const node = rowRefs.current.get(stageId);
        if (!node) return;

        const offsetY = previousTop - node.getBoundingClientRect().top;
        if (offsetY === 0) return;

        node.animate(
          [{ transform: `translateY(${offsetY}px)` }, { transform: 'translateY(0)' }],
          { duration: 180, easing: 'ease-out' },
        );
      });
    });
  }

  function moveStage(stageIndex: number, direction: -1 | 1) {
    reorderStages(stageIndex, stageIndex + direction, true);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex((stage) => stage.id === String(active.id));
    const newIndex = stages.findIndex((stage) => stage.id === String(over.id));
    reorderStages(oldIndex, newIndex);
  }

  return (
    <section hidden={hidden} className="space-y-5">
      <div>
        <div className="flex items-center gap-1.5">
          <h3 className="text-[15px] font-bold text-ink-900">Pipeline stages</h3>
          <FieldHelp
            content="Stages define the steps and forecast settings used on this pipeline."
            label="Help: Pipeline stages"
          />
        </div>
        <p className="mt-1 text-[12px] font-medium text-ink-500">
          Change each stage’s name, position, type, probability, and rotting threshold.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={stages.map((stage) => stage.id)}
          strategy={verticalListSortingStrategy}
        >
          <ol className="space-y-3">
            {stages.map((stage, index) => (
              <SortablePipelineStageRow
                key={stage.id}
                stage={stage}
                index={index}
                stageCount={stages.length}
                setRowRef={setRowRef}
                onMove={moveStage}
                onUpdate={updateStage}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </section>
  );
}
