'use client';

import Link from 'next/link';
import { ArrowRight, Mail, MessageCircle, Phone } from 'lucide-react';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import { Avatar } from '@/components/ui/avatar';
import { WidgetShell } from '@/features/dashboard/components/widget-shell';
import { useDashboardWidget } from '@/features/dashboard/hooks/use-dashboard-widget';
import { cn } from '@/lib/utils';

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function ConversationsWidget({
  filters,
  scenario,
}: {
  filters: DashboardFiltersInput;
  scenario?: string;
}) {
  const { data, isLoading, isError, refetch } = useDashboardWidget(
    'conversations',
    filters,
    scenario,
  );

  return (
    <WidgetShell
      title="Waiting for a reply"
      {...(data
        ? {
            subtitle: `${data.items.filter((item) => item.unread).length} unread across channels`,
          }
        : {})}
      isLoading={isLoading && !data}
      isError={isError}
      onRetry={() => refetch()}
      unavailable={data ? !data.moduleAvailable : false}
      action={
        data ? (
          <Link href={data.inboxHref} className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600">
            Inbox
            <ArrowRight className="size-4" />
          </Link>
        ) : null
      }
    >
      {data && data.items.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-ink-500">
          No conversations waiting for a reply.
        </p>
      ) : null}

      {data && data.items.length > 0 ? (
        <ul className="divide-y divide-line" role="list">
          {data.items.map((item) => (
            <li key={item.contactId}>
              <Link
                href={item.href}
                className="flex items-center gap-3 py-2.5 hover:bg-soft/50"
              >
                <div className="relative">
                  <Avatar initials={initials(item.contactName)} size="sm" />
                  <ChannelBadge channel={item.channel} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink-900">
                    {item.contactName}
                  </p>
                  <p className="truncate text-[12px] text-ink-500">{item.preview}</p>
                  {item.whatsappTemplateNeeded ? (
                    <p className="mt-1 text-[11px] font-medium text-amber-700">
                      Template needed
                    </p>
                  ) : null}
                </div>
                <div className="text-right text-[12px] text-ink-500">
                  {new Date(item.occurredAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {item.unread ? (
                    <span
                      className="mt-1 block size-2 rounded-full bg-brand-600"
                      aria-label="Unread"
                    />
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </WidgetShell>
  );
}

function ChannelBadge({
  channel,
}: {
  channel: 'email' | 'sms' | 'whatsapp' | 'call';
}) {
  const Icon =
    channel === 'email'
      ? Mail
      : channel === 'call'
        ? Phone
        : MessageCircle;
  return (
    <span
      className={cn(
        'absolute -right-1 -bottom-1 grid size-[18px] place-items-center rounded-md border-2 border-white',
        channel === 'email' && 'bg-brand-50 text-brand-700',
        channel === 'sms' && 'bg-brand-100 text-brand-700',
        channel === 'whatsapp' && 'bg-mint-50 text-mint-700',
        channel === 'call' && 'bg-brand-50 text-brand-700',
      )}
    >
      <Icon className="size-2.5" strokeWidth={2} />
    </span>
  );
}
