'use client';

import { MoreHorizontal } from 'lucide-react';
import type { PipelineStageView } from '@/domain/opportunities/card-view';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function BoardCardMenu({
  dealName,
  currentStageId,
  stages,
  onMoveToStage,
}: {
  dealName: string;
  currentStageId: string;
  stages: PipelineStageView[];
  onMoveToStage: (stageId: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="grid size-7 place-items-center rounded-lg text-ink-500 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-soft hover:text-ink-700 data-[state=open]:opacity-100"
          aria-label={`Actions for ${dealName}`}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuLabel className="text-[11px] font-semibold text-ink-500">
          Move to stage
        </DropdownMenuLabel>
        {stages.map((stage) => (
          <DropdownMenuItem
            key={stage.id}
            disabled={stage.id === currentStageId}
            onSelect={() => onMoveToStage(stage.id)}
          >
            {stage.name}
            {stage.id === currentStageId ? ' (current)' : ''}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
