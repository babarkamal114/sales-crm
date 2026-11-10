'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { AuthInput } from '@/components/auth/auth-layout';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { updateSpendLimitAction } from '@/server/actions/channels/usage';
import type { UsageOverview } from '@/domain/channels/usage-types';

async function fetchUsage(): Promise<UsageOverview> {
  const res = await fetch('/api/v1/channels/usage');
  if (!res.ok) throw new Error('Failed');
  return res.json() as Promise<UsageOverview>;
}

function formatPounds(pence: number): string {
  return `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function UsageSettingsClient() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['channels', 'usage'], queryFn: fetchUsage });
  const [pending, startTransition] = useTransition();
  const [limitPounds, setLimitPounds] = useState('');

  function reload() {
    void queryClient.invalidateQueries({ queryKey: ['channels', 'usage'] });
    void queryClient.invalidateQueries({ queryKey: ['channels', 'overview'] });
  }

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-[13px] text-ink-500">
        <Loader2 className="size-4 animate-spin" />
        Loading usage…
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <p className="text-[13px] text-rose-700">
        Could not load usage.{' '}
        <button type="button" className="underline" onClick={() => void query.refetch()}>
          Retry
        </button>
      </p>
    );
  }

  const { spend, byChannel } = query.data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/settings/channels" className="text-[13px] font-semibold text-brand-700 hover:underline">
          ← Channels
        </Link>
        <h1 className="mt-2 text-[22px] font-extrabold text-ink-900">Usage & limits</h1>
        <p className="mt-1 text-[13px] text-ink-500">
          Managed SMS, WhatsApp, and number rental meter here. Email and BYO provider traffic is not
          billed through this limit.
        </p>
      </div>

      <section className="rounded-xl2 border border-line/70 bg-white p-5 shadow-panel">
        <h2 className="text-[15px] font-extrabold text-ink-900">This month</h2>
        <p className="mt-2 text-[28px] font-extrabold text-ink-900 num">
          {formatPounds(spend.spentPence)}{' '}
          <span className="text-[15px] font-semibold text-ink-500">
            / {formatPounds(spend.monthlyLimitPence)}
          </span>
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-soft">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${Math.min(100, spend.percentUsed)}%` }}
          />
        </div>
        <p className="mt-2 text-[13px] text-ink-600">{spend.percentUsed}% of monthly limit</p>
        {spend.paused ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-800">
            Managed outbound sending is paused until the limit is raised or the month rolls over.
          </p>
        ) : spend.alertTriggered ? (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
            You have used {spend.alertAtPercent}% or more of your limit — consider raising it before
            outreach campaigns.
          </p>
        ) : null}
      </section>

      <section className="rounded-xl2 border border-line/70 bg-white p-5 shadow-panel">
        <h2 className="text-[15px] font-extrabold text-ink-900">By channel</h2>
        {byChannel.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-500">No metered usage recorded yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line/60">
            {byChannel.map((row) => (
              <li key={row.channel} className="flex justify-between py-2.5 text-[13px]">
                <span className="font-semibold capitalize text-ink-800">{row.channel}</span>
                <span className="text-ink-600 num">
                  {formatPounds(row.spentPence)} · {row.quantity} units
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl2 border border-line/70 bg-white p-5 shadow-panel space-y-3">
        <h2 className="text-[15px] font-extrabold text-ink-900">Monthly limit (Admin)</h2>
        <p className="text-[13px] text-ink-500">
          At 100% managed SMS/WhatsApp outbound is paused (inbound and email are unaffected).
        </p>
        <div className="max-w-xs">
          <Label htmlFor="limit">Limit (£)</Label>
          <AuthInput
            id="limit"
            inputMode="decimal"
            placeholder={String(Math.round(spend.monthlyLimitPence / 100))}
            value={limitPounds}
            onChange={(e) => setLimitPounds(e.target.value)}
          />
        </div>
        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            const pounds = Number(limitPounds.replace(/,/g, ''));
            if (!Number.isFinite(pounds) || pounds < 10) {
              alert('Enter at least £10');
              return;
            }
            startTransition(async () => {
              const r = await updateSpendLimitAction({
                monthlyLimitPence: Math.round(pounds * 100),
              });
              if (!r.ok) alert(r.error.message);
              else {
                setLimitPounds('');
                reload();
              }
            });
          }}
        >
          Update limit
        </Button>
      </section>

      <section className="rounded-xl2 border border-dashed border-line/80 bg-soft/40 p-4 text-[12px] leading-relaxed text-ink-500">
        <b className="text-ink-700">Abuse controls (active):</b> managed SMS is UK (+44) only; new
        organisations (&lt;14 days) are capped at 50 SMS/day. Staff admin console and Stripe metered
        export are planned follow-ups.
      </section>
    </div>
  );
}
