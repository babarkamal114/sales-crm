'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import { StatusPill } from '@/components/ui/status-pill';
import { WidgetShell } from '@/features/dashboard/components/widget-shell';
import { useDashboardWidget } from '@/features/dashboard/hooks/use-dashboard-widget';

export function TasksWidget({
  filters,
  scenario,
}: {
  filters: DashboardFiltersInput;
  scenario?: string;
}) {
  const { data, isLoading, isError, refetch } = useDashboardWidget(
    'tasks',
    filters,
    scenario,
  );

  const empty = data && data.items.length === 0;

  return (
    <WidgetShell
      title="My tasks today"
      {...(data
        ? {
            subtitle: `${data.progress.openDueToday + data.progress.overdueCount} open · ${data.progress.overdueCount} overdue`,
          }
        : {})}
      isLoading={isLoading && !data}
      isError={isError}
      onRetry={() => refetch()}
      unavailable={data ? !data.moduleAvailable : false}
      action={
        data ? (
          <Link
            href={data.viewAllHref}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600"
          >
            All tasks
            <ArrowRight className="size-4" />
          </Link>
        ) : null
      }
    >
      {data && empty ? (
        <div className="py-6 text-center">
          <p className="text-[13px] font-semibold text-ink-900">
            You&apos;re all caught up
          </p>
          <Link href="/tasks" className="mt-2 inline-block text-[12px] font-semibold text-brand-600">
            Add task
          </Link>
        </div>
      ) : null}

      {data && !empty ? (
        <ul className="divide-y divide-line" role="list">
          {data.items.map((task) => (
            <li key={task.taskId} className="flex items-center gap-3 py-2.5">
              <input
                type="checkbox"
                className="size-5 rounded-md border-border-input"
                aria-label={`Mark ${task.title} done`}
                defaultChecked={task.status === 'completed_today'}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={
                    task.status === 'completed_today'
                      ? 'truncate text-[14px] text-ink-500 line-through'
                      : 'truncate text-[14px] font-semibold text-ink-900'
                  }
                >
                  {task.title}
                </p>
                <Link
                  href={task.contactHref}
                  className="truncate text-[12px] text-ink-500 hover:text-brand-600"
                >
                  {task.contactName}
                </Link>
              </div>
              <StatusPill
                status={
                  task.status === 'overdue'
                    ? 'Overdue'
                    : task.status === 'completed_today'
                      ? 'Open'
                      : 'Due soon'
                }
              />
            </li>
          ))}
        </ul>
      ) : null}

      {data && data.totalCount > data.items.length ? (
        <Link
          href={data.viewAllHref}
          className="mt-3 inline-block text-[12px] font-semibold text-brand-600"
        >
          View all {data.totalCount} tasks
        </Link>
      ) : null}
    </WidgetShell>
  );
}
