'use client';

import Link from 'next/link';
import { Clock, Kanban, Trophy, UserPlus } from 'lucide-react';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import { Card } from '@/components/ui/card';
import { Sparkline } from '@/components/ui/sparkline';
import { formatMoney, formatMoneyCompact } from '@/lib/money';
import { useDashboardWidget } from '@/features/dashboard/hooks/use-dashboard-widget';
import { cn } from '@/lib/utils';

function DeltaPill({ label, direction }: { label: string; direction: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums',
        direction === 'up' && 'text-mint-700',
        direction === 'down' && 'text-ink-400',
        direction === 'flat' && 'text-ink-400',
      )}
    >
      {label}
    </span>
  );
}

const kpiCardClass =
  'h-full border-line/60 p-5 shadow-panel transition-all duration-150 hover:-translate-y-0.5 hover:shadow-auth-float motion-reduce:transform-none motion-reduce:transition-none';

export function KpiCardsWidget({
  filters,
  scenario,
}: {
  filters: DashboardFiltersInput;
  scenario?: string;
}) {
  const { data, isLoading, isError, refetch, isFetching } = useDashboardWidget(
    'kpis',
    filters,
    scenario,
  );

  if (isLoading && !data) {
    return (
      <section
        className="grid grid-cols-2 gap-3.5 lg:grid-cols-4"
        aria-label="Key figures"
        aria-busy="true"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <Card
            key={index}
            className={cn(kpiCardClass, 'min-h-[148px] animate-pulse bg-soft/30')}
          />
        ))}
      </section>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-line/60 p-5 shadow-panel" role="alert">
        <p className="text-[13px] font-medium text-ink-700">
          Could not load key figures.{' '}
          <button
            type="button"
            className="font-semibold text-brand-600"
            onClick={() => refetch()}
          >
            Try again
          </button>
        </p>
      </Card>
    );
  }

  const cards = [
    {
      key: 'open',
      href: data.openPipeline.href,
      label: 'Open pipeline',
      icon: Kanban,
      iconClass: 'bg-brand-50 text-brand-700',
      value: formatMoneyCompact(data.openPipeline.valuePence),
      exact: formatMoney(data.openPipeline.valuePence),
      meta: `${data.openPipeline.openCount} open deals`,
      delta: data.openPipeline.delta,
      sparkline: data.openPipeline.sparkline,
      stroke: 'stroke-brand-500',
      fill: 'fill-brand-500/10',
      formatSparklineValue: (v: number) => formatMoneyCompact(v * 100),
    },
    {
      key: 'won',
      href: data.wonThisPeriod.href,
      label: 'Won this period',
      icon: Trophy,
      iconClass: 'bg-mint-50 text-mint-700',
      value: formatMoneyCompact(data.wonThisPeriod.valuePence),
      exact: formatMoney(data.wonThisPeriod.valuePence),
      meta: `${data.wonThisPeriod.wonCount} deals`,
      delta: data.wonThisPeriod.delta,
      sparkline: data.wonThisPeriod.sparkline,
      stroke: 'stroke-mint-500',
      fill: 'fill-mint-500/10',
      formatSparklineValue: (v: number) => formatMoneyCompact(v * 100),
    },
    {
      key: 'leads',
      href: data.newLeads.href,
      label: 'New leads',
      icon: UserPlus,
      iconClass: 'bg-brand-50 text-brand-700',
      value: String(data.newLeads.count),
      exact: String(data.newLeads.count),
      meta: data.newLeads.topSources
        .map((source) => `${source.count} from ${source.source}`)
        .join(' · '),
      delta: data.newLeads.delta,
      sparkline: data.newLeads.sparkline,
      stroke: 'stroke-brand-500',
      fill: 'fill-brand-500/10',
    },
    {
      key: 'tasks',
      href: data.tasksDueToday.href,
      label: 'Tasks due today',
      icon: Clock,
      iconClass: 'bg-amber-50 text-amber-700',
      value: data.tasksDueToday.moduleAvailable
        ? String(data.tasksDueToday.openDueToday)
        : '—',
      exact: String(data.tasksDueToday.openDueToday),
      meta: data.tasksDueToday.moduleAvailable
        ? `${data.tasksDueToday.overdueCount} overdue · ${data.tasksDueToday.completedToday} done`
        : 'Not available',
      delta: data.tasksDueToday.delta,
      sparkline: data.tasksDueToday.sparkline,
      stroke: 'stroke-amber-500',
      fill: 'fill-amber-500/10',
      progress: data.tasksDueToday.progressRatio,
    },
  ];

  return (
    <section
      className={cn(
        'grid grid-cols-2 gap-3.5 lg:grid-cols-4',
        isFetching && 'opacity-95',
      )}
      aria-label="Key figures"
      aria-busy={isFetching}
    >
      {cards.map((card) => (
        <Link key={card.key} href={card.href} className="group block min-w-0">
          <Card className={kpiCardClass}>
            <div className="mb-3 flex items-center gap-2">
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-lg',
                  card.iconClass,
                )}
              >
                <card.icon className="size-3.5" strokeWidth={2.2} />
              </span>
              <p className="text-[13px] font-bold text-ink-900">{card.label}</p>
            </div>
            <p
              className="tnum text-[30px] leading-none font-extrabold text-ink-900"
              title={'exact' in card ? card.exact : undefined}
            >
              {card.value}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-ink-500">
              <span>{card.meta}</span>
              {card.delta ? (
                <DeltaPill label={card.delta.label} direction={card.delta.direction} />
              ) : null}
            </div>
            {'progress' in card && card.progress !== undefined ? (
              <div
                className="mt-3 h-2.5 overflow-hidden rounded-full bg-soft"
                role="img"
                aria-label={`${Math.round((card.progress ?? 0) * 100)}% of today's tasks complete`}
              >
                <div
                  className="h-full rounded-full bg-mint-500"
                  style={{ width: `${Math.round((card.progress ?? 0) * 100)}%` }}
                />
              </div>
            ) : (
              <Sparkline
                points={card.sparkline}
                strokeClassName={card.stroke}
                fillClassName={card.fill}
                className="mt-3"
                {...('formatSparklineValue' in card
                  ? { formatValue: card.formatSparklineValue }
                  : {})}
              />
            )}
          </Card>
        </Link>
      ))}
    </section>
  );
}
