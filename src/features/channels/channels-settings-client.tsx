'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { ChannelCardState, ChannelOverviewCard } from '@/domain/channels/overview';
import { StatusPill } from '@/components/ui/status-pill';
import { cn } from '@/lib/utils';

const STATE_LABEL: Record<ChannelCardState, string> = {
  not_set_up: 'Not set up',
  in_progress: 'In progress',
  needs_attention: 'Needs attention',
  suspended: 'Suspended',
  active: 'Active',
};

const STATE_TONE: Record<
  ChannelCardState,
  'neutral' | 'brand' | 'warning' | 'danger' | 'success'
> = {
  not_set_up: 'neutral',
  in_progress: 'brand',
  needs_attention: 'warning',
  suspended: 'danger',
  active: 'success',
};

async function fetchOverview() {
  const res = await fetch('/api/v1/channels/overview');
  if (!res.ok) throw new Error('Failed');
  return res.json() as Promise<{ cards: ChannelOverviewCard[] }>;
}

function ChannelCard({ card }: { card: ChannelOverviewCard }) {
  return (
    <article className="rounded-xl2 border border-line/70 bg-white p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-extrabold text-ink-900">{card.title}</h2>
          {card.providerLabel ? (
            <p className="mt-0.5 text-[12px] font-medium capitalize text-ink-500">
              {card.mode === 'byo' ? 'Bring your own' : card.mode === 'managed' ? 'Managed' : 'Mailbox'}{' '}
              · {card.providerLabel}
            </p>
          ) : null}
        </div>
        <StatusPill status={STATE_LABEL[card.state]} className={cn(
          STATE_TONE[card.state] === 'success' && 'text-mint-700',
          STATE_TONE[card.state] === 'warning' && 'text-amber-700',
          STATE_TONE[card.state] === 'danger' && 'text-rose-700',
        )} />
      </div>

      {card.identity ? (
        <p className="mt-3 text-[13px] font-semibold text-ink-800">{card.identity}</p>
      ) : null}
      {card.statusReason ? (
        <p className="mt-2 text-[13px] text-rose-700">{card.statusReason}</p>
      ) : null}
      {card.nextAction ? (
        <p className="mt-2 text-[13px] text-ink-600">{card.nextAction}</p>
      ) : null}
      {card.lastCheckedAt ? (
        <p className="mt-2 text-[11px] text-ink-400">
          Last checked {new Date(card.lastCheckedAt).toLocaleString('en-GB')}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {card.id === 'email' && !card.readOnly ? (
          <>
            <Link
              href="/api/integrations/google_mail/start?return=%2Fsettings%2Fchannels"
              className="inline-flex h-9 items-center rounded-xl bg-brand-600 px-3 text-[13px] font-semibold text-white hover:bg-brand-700"
            >
              Connect Google
            </Link>
            <Link
              href="/api/integrations/microsoft_mail/start?return=%2Fsettings%2Fchannels"
              className="inline-flex h-9 items-center rounded-xl border border-line px-3 text-[13px] font-semibold text-ink-800 hover:bg-soft"
            >
              Connect Microsoft
            </Link>
          </>
        ) : null}
        {card.id === 'phone_sms' && !card.readOnly ? (
          <Link
            href="/settings/channels/phone"
            className="inline-flex h-9 items-center rounded-xl border border-line px-3 text-[13px] font-semibold text-ink-800 hover:bg-soft"
          >
            Manage numbers
          </Link>
        ) : null}
        {card.id === 'whatsapp' && !card.readOnly ? (
          <Link
            href="/settings/channels/whatsapp"
            className="inline-flex h-9 items-center rounded-xl border border-line px-3 text-[13px] font-semibold text-ink-800 hover:bg-soft"
          >
            Manage WhatsApp
          </Link>
        ) : null}
        {card.id === 'usage' && !card.readOnly ? (
          <Link
            href="/settings/channels/usage"
            className="inline-flex h-9 items-center rounded-xl border border-line px-3 text-[13px] font-semibold text-ink-800 hover:bg-soft"
          >
            View usage
          </Link>
        ) : null}
        {card.readOnly ? (
          <span className="text-[12px] font-medium text-ink-500">View only — ask an Admin to change setup</span>
        ) : null}
      </div>
    </article>
  );
}

export function ChannelsSettingsClient() {
  const query = useQuery({
    queryKey: ['channels', 'overview'],
    queryFn: fetchOverview,
  });

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-[13px] text-ink-500">
        <Loader2 className="size-4 animate-spin" />
        Loading channels…
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <p className="py-12 text-[13px] text-rose-700">
        Could not load channels.{' '}
        <button type="button" className="underline" onClick={() => void query.refetch()}>
          Retry
        </button>
      </p>
    );
  }

  return (
    <div className={cn('grid gap-4 lg:grid-cols-2')}>
      {query.data.cards.map((card) => (
        <ChannelCard key={card.id} card={card} />
      ))}
    </div>
  );
}
