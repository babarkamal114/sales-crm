'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Plus } from 'lucide-react';
import type { PipelineListItem } from '@/domain/opportunities/card-view';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function PipelinePicker({
  pipelines,
  value,
  onChange,
  canCreatePipeline,
}: {
  pipelines: PipelineListItem[];
  value: string;
  onChange: (pipelineId: string) => void;
  canCreatePipeline: boolean;
}) {
  const [open, setOpen] = useState(false);
  const active = pipelines.find((item) => item.id === value) ?? pipelines[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 max-w-[min(100%,320px)] items-center gap-2 rounded-xl border border-ink-300/80 bg-white px-3.5 text-left text-[13px] font-semibold text-ink-900 shadow-sm transition-colors hover:border-brand-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className="truncate">{active?.name ?? 'Pipeline'}</span>
          {active ? (
            <span className="shrink-0 rounded-full bg-soft px-2 py-0.5 text-[11px] font-semibold text-ink-500 num">
              {active.openDealCount}
            </span>
          ) : null}
          <ChevronDown className="ml-auto size-4 shrink-0 text-ink-400" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[280px] p-1.5"
        role="listbox"
        aria-label="Pipelines"
      >
        <p className="px-2.5 pb-1 pt-2 text-[12px] font-medium text-ink-500">Pipelines</p>
        <ul className="max-h-[280px] overflow-y-auto scroll-thin">
          {pipelines.map((pipeline) => {
            const selected = pipeline.id === value;
            return (
              <li key={pipeline.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[13px] font-medium text-ink-900 transition-colors hover:bg-soft focus-visible:bg-soft focus-visible:outline-none',
                    selected && 'bg-brand-50 font-semibold text-brand-700',
                  )}
                  onClick={() => {
                    onChange(pipeline.id);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{pipeline.name}</span>
                  <span className="shrink-0 text-[12px] font-semibold text-ink-500 num">
                    {pipeline.openDealCount}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {canCreatePipeline ? (
          <>
            <div className="mx-1 my-1.5 h-px bg-line" />
            <Link
              href="/settings"
              className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-[13px] font-semibold text-brand-600 transition-colors hover:bg-soft"
              onClick={() => setOpen(false)}
            >
              <Plus className="size-4" aria-hidden />
              New pipeline
            </Link>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
