'use client';

import {
  ArrowDown,
  ArrowUp,
  GripVertical,
} from 'lucide-react';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { FieldHelp } from '@/components/ui/field-help';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { EditablePipelineStage } from '@/features/opportunities/components/pipeline-settings-stage-types';
import { cn } from '@/lib/utils';

export function SortablePipelineStageRow({
  stage,
  index,
  stageCount,
  setRowRef,
  onMove,
  onUpdate,
}: {
  stage: EditablePipelineStage;
  index: number;
  stageCount: number;
  setRowRef: (stageId: string, node: HTMLLIElement | null) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onUpdate: (stageId: string, updates: Partial<EditablePipelineStage>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stage.id,
  });

  return (
    <li
      ref={(node) => {
        setNodeRef(node);
        setRowRef(stage.id, node);
      }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'rounded-xl border border-line bg-white p-4',
        isDragging && 'z-10 border-brand-300 bg-brand-50/40 shadow-card',
      )}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <p className="text-[12px] font-bold text-ink-700">Stage {index + 1}</p>
          <FieldHelp
            content="This number is the stage’s position in the pipeline. Drag the handle or use the arrows to reorder."
            label={`Help: Stage ${index + 1} position`}
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="icon"
            size="icon"
            className="size-8 touch-none rounded-lg"
            aria-label={`Drag ${stage.name} to reorder`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="icon"
            size="icon"
            className="size-8 rounded-lg"
            disabled={index === 0}
            aria-label={`Move ${stage.name} up`}
            onClick={() => onMove(index, -1)}
          >
            <ArrowUp className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="icon"
            size="icon"
            className="size-8 rounded-lg"
            disabled={index === stageCount - 1}
            aria-label={`Move ${stage.name} down`}
            onClick={() => onMove(index, 1)}
          >
            <ArrowDown className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <Label htmlFor={`${stage.id}-name`}>Stage name</Label>
            <FieldHelp
              content="The name displayed for this stage on the opportunities board."
              label={`Help: ${stage.name} name`}
            />
          </div>
          <Input
            id={`${stage.id}-name`}
            value={stage.name}
            onChange={(event) => onUpdate(stage.id, { name: event.target.value })}
            maxLength={120}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <Label htmlFor={`${stage.id}-kind`}>Stage type</Label>
            <FieldHelp
              content="Choose whether opportunities in this stage are open, won, or lost."
              label={`Help: ${stage.name} type`}
            />
          </div>
          <Select
            id={`${stage.id}-kind`}
            value={stage.kind}
            onChange={(event) => {
              const kind = event.target.value as EditablePipelineStage['kind'];
              const probability =
                kind === 'won' ? 100 : kind === 'lost' ? 0 : stage.probability;
              onUpdate(stage.id, { kind, probability });
            }}
          >
            <option value="open">Open</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <Label htmlFor={`${stage.id}-probability`}>Probability</Label>
            <FieldHelp
              content="Default forecast probability for opportunities in this open stage."
              label={`Help: ${stage.name} probability`}
            />
          </div>
          {stage.kind === 'open' ? (
            <Input
              id={`${stage.id}-probability`}
              type="number"
              min={0}
              max={100}
              step={1}
              value={stage.probability ?? ''}
              onChange={(event) =>
                onUpdate(stage.id, {
                  probability: event.target.value === '' ? null : Number(event.target.value),
                })
              }
            />
          ) : (
            <p
              id={`${stage.id}-probability`}
              className="flex h-11 items-center rounded-2xl bg-soft/50 px-4 text-[13px] font-medium text-ink-500"
            >
              {stage.kind === 'won' ? '100%' : '0%'} · fixed by stage type
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1">
            <Label htmlFor={`${stage.id}-rotting-days`}>Rotting threshold (days)</Label>
            <FieldHelp
              content="Marks an open opportunity as rotting after this many inactive calendar days when it has no open task."
              label={`Help: ${stage.name} rotting threshold`}
            />
          </div>
          <Input
            id={`${stage.id}-rotting-days`}
            type="number"
            min={1}
            step={1}
            value={stage.kind === 'open' ? stage.rottingDays ?? '' : ''}
            placeholder={stage.kind === 'open' ? 'Disabled' : 'Open stages only'}
            disabled={stage.kind !== 'open'}
            onChange={(event) =>
              onUpdate(stage.id, {
                rottingDays: event.target.value === '' ? null : Number(event.target.value),
              })
            }
          />
        </div>
      </div>
    </li>
  );
}
