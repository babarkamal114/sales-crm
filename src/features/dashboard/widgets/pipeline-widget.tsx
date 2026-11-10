'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import { formatMoney } from '@/lib/money';
import { WidgetShell } from '@/features/dashboard/components/widget-shell';
import { useDashboardWidget } from '@/features/dashboard/hooks/use-dashboard-widget';
import { cn } from '@/lib/utils';

export function PipelineWidget({
  filters,
  scenario,
}: {
  filters: DashboardFiltersInput;
  scenario?: string;
}) {
  const { data, isLoading, isError, refetch, isFetching } = useDashboardWidget(
    'pipeline',
    filters,
    scenario,
  );

  return (
    <WidgetShell
      title="Pipeline"
      subtitle={
        data
          ? `${data.pipelineName} · open deals by stage`
          : 'Open deals by stage'
      }
      isLoading={isLoading && !data}
      isError={isError}
      onRetry={() => refetch()}
      unavailable={data ? !data.moduleAvailable : false}
      action={
        data ? (
          <Link
            href={data.boardHref}
            className="inline-flex items-center gap-1 text-[12.5px] font-bold text-brand-600 hover:text-brand-700"
          >
            Open board
            <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
        ) : null
      }
      className={cn(isFetching && 'opacity-95')}
    >
      {data ? (
        <>
          <ul className="space-y-3" role="list">
            {data.stages.map((stage) => {
              const width =
                stage.barMaxValuePence > 0
                  ? (stage.valuePence / stage.barMaxValuePence) * 100
                  : 0;
              return (
                <li key={stage.stageId}>
                  <Link
                    href={stage.href}
                    className="grid grid-cols-[minmax(0,132px)_1fr_96px] items-center gap-3 rounded-xl px-1 py-1 hover:bg-soft/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink-900">
                        {stage.name}
                      </p>
                      <p className="text-[12px] text-ink-500 tabular-nums">
                        {stage.count} deals
                      </p>
                    </div>
                    <div className="relative h-[30px] overflow-hidden rounded-[10px] bg-soft">
                      <div
                        className={cn(
                          'absolute inset-y-0 left-0 flex items-center justify-end rounded-[10px] px-2 text-[12px] font-semibold text-white tabular-nums motion-safe:transition-[width] motion-safe:duration-700',
                          stage.kind === 'won' &&
                            'bg-gradient-to-r from-mint-400 to-mint-500',
                          stage.kind === 'lost' &&
                            'bg-gradient-to-r from-rose-300 to-rose-500',
                          stage.kind === 'open' &&
                            'bg-gradient-to-r from-brand-500 to-brand-600',
                        )}
                        style={{ width: `${Math.max(width, stage.count > 0 ? 12 : 0)}%` }}
                      >
                        {stage.count}
                      </div>
                    </div>
                    <p className="text-right text-[13px] font-semibold text-ink-900 tabular-nums">
                      {formatMoney(stage.valuePence)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-wrap gap-6 border-t border-line pt-4">
            <Stat label="Lead to won" value={`${data.footer.leadToWonPercent ?? 0}%`} />
            <Stat
              label="Average won deal"
              value={
                data.footer.averageWonDealPence
                  ? formatMoney(data.footer.averageWonDealPence)
                  : '—'
              }
            />
            <Stat
              label="Average time to win"
              value={
                data.footer.averageDaysToWin
                  ? `${data.footer.averageDaysToWin} days`
                  : '—'
              }
            />
            <Stat
              label="Awaiting a decision"
              value={formatMoney(data.footer.awaitingDecisionPence)}
            />
          </div>
        </>
      ) : null}
    </WidgetShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-ink-500">{label}</p>
      <p className="tnum text-[15px] font-extrabold leading-snug text-ink-900">
        {value}
      </p>
    </div>
  );
}
