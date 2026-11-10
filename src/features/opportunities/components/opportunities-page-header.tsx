'use client';

import { Plus } from 'lucide-react';
import type { PipelineListItem } from '@/domain/opportunities/card-view';
import { PipelinePicker } from '@/features/opportunities/components/pipeline-picker';
import { OpportunitiesViewSwitch } from '@/features/opportunities/components/opportunities-view-switch';
import { Button } from '@/components/ui/button';

export function OpportunitiesPageHeader({
  pipelines,
  pipelineId,
  view,
  canCreatePipeline,
  onPipelineChange,
  onViewChange,
  onAddOpportunity,
}: {
  pipelines: PipelineListItem[];
  pipelineId: string;
  view: 'board' | 'list' | 'forecast';
  canCreatePipeline: boolean;
  onPipelineChange: (id: string) => void;
  onViewChange: (view: 'board' | 'list' | 'forecast') => void;
  onAddOpportunity: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center gap-3.5 gap-y-3">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <h1 className="text-[22px] font-bold leading-[30px] text-ink-900">Opportunities</h1>
        <PipelinePicker
          pipelines={pipelines}
          value={pipelineId}
          onChange={onPipelineChange}
          canCreatePipeline={canCreatePipeline}
        />
      </div>

      <OpportunitiesViewSwitch value={view} onChange={onViewChange} />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button type="button" className="shadow-[0_8px_18px_-8px_rgba(83,97,219,0.7)]" onClick={onAddOpportunity}>
          <Plus className="size-4" aria-hidden />
          Add opportunity
        </Button>
      </div>
    </header>
  );
}
