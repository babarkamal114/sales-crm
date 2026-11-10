'use client';

import Link from 'next/link';
import { ArrowRight, Phone, Sparkles, Trophy, UserPlus } from 'lucide-react';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import { Avatar } from '@/components/ui/avatar';
import { Callout } from '@/components/ui/callout';
import { WidgetShell } from '@/features/dashboard/components/widget-shell';
import {
  isDashboardWidgetForbidden,
  useDashboardWidget,
} from '@/features/dashboard/hooks/use-dashboard-widget';
import { formatMoney } from '@/lib/money';

export function ActivityWidget({
  filters,
  scenario,
}: {
  filters: DashboardFiltersInput;
  scenario?: string;
}) {
  const { data, isLoading, isError, refetch } = useDashboardWidget(
    'activity',
    filters,
    scenario,
  );

  return (
    <WidgetShell
      title="Recent activity"
      subtitle="Across your pipelines"
      isLoading={isLoading && !data}
      isError={isError}
      onRetry={() => refetch()}
      unavailable={data ? !data.moduleAvailable : false}
      action={
        data ? (
          <Link href={data.viewAllHref} className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600">
            View all
            <ArrowRight className="size-4" />
          </Link>
        ) : null
      }
    >
      {data && data.items.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-ink-500">No activity yet.</p>
      ) : null}
      {data && data.items.length > 0 ? (
        <ul className="divide-y divide-line" role="list">
          {data.items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="grid grid-cols-[34px_1fr_auto] gap-3 py-3">
                <ActivityIcon kind={item.icon} />
                <div className="min-w-0">
                  <p className="text-[14px] text-ink-700">
                    <span className="font-semibold text-ink-900">{item.actorName}</span>{' '}
                    {item.body}
                  </p>
                  {item.detail ? (
                    <p className="text-[12px] text-ink-500">{item.detail}</p>
                  ) : null}
                  {item.aiSummary ? (
                    <p className="mt-2 rounded-xl border border-line bg-soft/70 px-3 py-2 text-[13px] text-ink-700">
                      <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700">
                        <Sparkles className="size-3" />
                        AI summary
                      </span>
                      {item.aiSummary}
                    </p>
                  ) : null}
                </div>
                <time className="text-[12px] whitespace-nowrap text-ink-500">
                  {new Date(item.occurredAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </WidgetShell>
  );
}

function ActivityIcon({ kind }: { kind: string }) {
  const Icon =
    kind === 'won' ? Trophy : kind === 'call' ? Phone : kind === 'lead' ? UserPlus : ArrowRight;
  return (
    <span className="grid size-[34px] place-items-center rounded-[11px] bg-brand-50 text-brand-700">
      <Icon className="size-4" strokeWidth={1.9} />
    </span>
  );
}

export function TeamWidget({
  filters,
  scenario,
  canViewTeam,
}: {
  filters: DashboardFiltersInput;
  scenario?: string;
  canViewTeam: boolean;
}) {
  const { data, isLoading, isError, refetch, error } = useDashboardWidget(
    'team',
    filters,
    scenario,
    { enabled: canViewTeam },
  );

  if (!canViewTeam) return null;

  const forbidden = isDashboardWidgetForbidden(error);

  return (
    <WidgetShell
      title="Team this period"
      subtitle="Won value"
      isLoading={isLoading && !data && !forbidden}
      isError={isError && !forbidden}
      onRetry={() => refetch()}
      unavailable={forbidden || (data ? !data.moduleAvailable : false)}
      unavailableMessage={forbidden ? 'Not available for your role' : 'Coming soon'}
    >
      {data && data.members.length > 0 ? (
        <ul className="divide-y divide-line" role="list">
          {data.members.map((member, index) => (
            <li key={member.userId} className="flex items-center gap-3 py-2.5">
              <span className="w-[22px] text-center text-[12px] font-bold text-ink-500">
                {index + 1}
              </span>
              <Avatar
                initials={member.fullName
                  .split(/\s/)
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink-900">
                  {member.fullName}
                </p>
                <p className="text-[12px] text-ink-500 tabular-nums">
                  {member.callsCount} calls · {member.wonCount} won
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-soft">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${member.leaderPercent}%` }}
                  />
                </div>
              </div>
              <p className="text-[14px] font-bold tabular-nums">
                {formatMoney(member.wonValuePence)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </WidgetShell>
  );
}

export function NudgeCallout({
  filters,
  scenario,
}: {
  filters: DashboardFiltersInput;
  scenario?: string;
}) {
  const { data } = useDashboardWidget('nudge', filters, scenario);
  if (!data || data.count === 0 || !data.moduleAvailable) return null;

  return (
    <Callout tone="amber" className="mt-3">
      <div>
        <p className="font-semibold">
          {data.count} leads have no next step
        </p>
        <p className="mt-0.5 font-normal">
          Open opportunities with no open task and no activity in the last 7 days.{' '}
          <Link href={data.href} className="font-semibold underline">
            Review leads
          </Link>
        </p>
      </div>
    </Callout>
  );
}
