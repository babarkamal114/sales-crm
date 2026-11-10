'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';

const PERIOD_OPTIONS = [
  { value: 'today' as const, label: 'Today' },
  { value: 'week' as const, label: 'This week' },
  { value: 'month' as const, label: 'This month' },
  { value: 'quarter' as const, label: 'Quarter' },
];

export function DashboardToolbar({
  filters,
  canUseTeamScope,
  liveConnected,
  onFiltersChange,
}: {
  filters: DashboardFiltersInput;
  canUseTeamScope: boolean;
  liveConnected: boolean;
  onFiltersChange: (patch: Partial<DashboardFiltersInput>) => void;
}) {
  const liveRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    liveRef.current?.setAttribute('aria-live', 'polite');
  }, [filters.period, filters.scope, filters.pipeline]);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white bg-white px-3 text-[13px] font-semibold text-ink-900 shadow-panel"
        aria-label="Pipeline filter"
        aria-haspopup="listbox"
        disabled
      >
        All pipelines
        <ChevronDown className="size-4 text-ink-500" strokeWidth={2} />
      </button>

      <SegmentedControl
        label="Period"
        value={filters.period}
        options={PERIOD_OPTIONS}
        onChange={(period) => onFiltersChange({ period })}
      />

      {canUseTeamScope ? (
        <SegmentedControl
          label="Whose data"
          value={filters.scope}
          options={[
            { value: 'mine', label: 'Mine' },
            { value: 'team', label: 'Team' },
          ]}
          onChange={(scope) => onFiltersChange({ scope })}
        />
      ) : null}

      <span
        ref={liveRef}
        className="ml-auto flex items-center gap-1.5 text-[12px] text-ink-500 max-lg:w-full"
      >
        <span
          className={cn(
            'size-2 rounded-full',
            liveConnected
              ? 'bg-mint-500 shadow-[0_0_0_3px] shadow-mint-50'
              : 'bg-ink-300',
          )}
          aria-hidden
        />
        {liveConnected ? 'Live · updated just now' : 'Paused'}
      </span>
    </div>
  );
}
