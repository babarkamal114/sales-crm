'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import { DonutChart } from '@/components/ui/donut-chart';
import { WidgetShell } from '@/features/dashboard/components/widget-shell';
import { useDashboardWidget } from '@/features/dashboard/hooks/use-dashboard-widget';
import { cn } from '@/lib/utils';

export function SourcesWidget({
  filters,
  scenario,
}: {
  filters: DashboardFiltersInput;
  scenario?: string;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useDashboardWidget(
    'sources',
    filters,
    scenario,
  );

  return (
    <WidgetShell
      title="Where leads came from"
      {...(data ? { subtitle: `${data.totalContacts} leads this period` } : {})}
      isLoading={isLoading && !data}
      isError={isError}
      onRetry={() => refetch()}
      unavailable={data ? !data.moduleAvailable : false}
    >
      {data && data.segments.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-ink-500">
          No leads in this period yet.
        </p>
      ) : null}

      {data && data.segments.length > 0 ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <DonutChart
            segments={data.segments.map((segment) => ({
              id: segment.source,
              value: segment.count,
              colorClass: segment.colorToken,
              label: segment.source,
            }))}
            centerLabel="leads"
            centerValue={String(data.totalContacts)}
            summary={data.accessibleSummary}
            activeId={activeId}
            onSegmentHover={setActiveId}
          />
          <ul className="min-w-0 flex-1 space-y-2">
            {data.segments.map((segment) => (
              <li key={segment.source}>
                <Link
                  href={segment.href}
                  className={cn(
                    'grid grid-cols-[10px_1fr_auto] items-center gap-2 rounded-lg px-1 py-1 text-[13px] hover:bg-soft/60',
                    activeId === segment.source && 'bg-soft/80',
                  )}
                  onMouseEnter={() => setActiveId(segment.source)}
                  onMouseLeave={() => setActiveId(null)}
                >
                  <span
                    className={cn(
                      'size-2.5 rounded-sm',
                      segment.colorToken === 'brand-700' && 'bg-brand-700',
                      segment.colorToken === 'brand-500' && 'bg-brand-500',
                      segment.colorToken === 'brand-300' && 'bg-brand-300',
                      segment.colorToken === 'brand-100' && 'bg-brand-100',
                      segment.colorToken === 'ink-300' && 'bg-ink-300',
                    )}
                  />
                  <span className="truncate text-ink-700">{segment.source}</span>
                  <span className="font-semibold text-ink-900 tabular-nums">
                    {segment.count}
                    <span className="ml-1 text-[12px] font-normal text-ink-500">
                      {segment.wonCount} won
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </WidgetShell>
  );
}
