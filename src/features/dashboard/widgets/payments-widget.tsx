'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { WidgetShell } from '@/features/dashboard/components/widget-shell';
import { useDashboardWidget } from '@/features/dashboard/hooks/use-dashboard-widget';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';

export function PaymentsWidget({
  filters,
  scenario,
}: {
  filters: DashboardFiltersInput;
  scenario?: string;
}) {
  const { data, isLoading, isError, refetch } = useDashboardWidget(
    'payments',
    filters,
    scenario,
  );

  const disconnected = Boolean(data && !data.stripeConnected);
  const unavailable = Boolean(data && !data.moduleAvailable);

  return (
    <WidgetShell
      title="Payments"
      subtitle="Mirrored from Stripe"
      isLoading={isLoading && !data}
      isError={isError}
      onRetry={() => refetch()}
      unavailable={unavailable}
      className="h-full"
      action={
        data && !unavailable ? (
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-[12.5px] font-bold text-brand-600 hover:text-brand-700"
          >
            Invoices
            <ArrowRight className="size-4" strokeWidth={2} />
          </Link>
        ) : null
      }
    >
      {data && disconnected ? (
        <div className="space-y-3 py-6 text-center">
          <p className="text-[13px] font-medium text-ink-700">
            {data.canConnectStripe
              ? 'Connect Stripe to see payments'
              : "Payments aren't connected yet"}
          </p>
          {data.canConnectStripe ? (
            <Button variant="secondary" size="sm" asChild>
              <Link href="/settings">Connect Stripe</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {data && !disconnected && !unavailable ? (
        <div className="space-y-4">
          <div
            className={cn(
              'grid gap-3',
              data.totalsByCurrency.length > 1
                ? 'sm:grid-cols-2'
                : 'grid-cols-1',
            )}
          >
            {data.totalsByCurrency.map((row) => (
              <div
                key={row.currency}
                className="rounded-xl2 border border-line/60 bg-white px-4 py-3.5 shadow-panel"
              >
                <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-400">
                  Paid this period ({row.currency})
                </p>
                <p className="tnum mt-1.5 text-[26px] font-extrabold leading-none text-ink-900">
                  {formatMoney(row.paidThisPeriodPence)}
                </p>
                <p className="mt-2 space-y-0.5 text-[11px] font-medium leading-snug text-ink-400">
                  <span className="block">
                    Due soon {formatMoney(row.dueWithin7DaysPence)}
                  </span>
                  <span className="block">
                    Overdue {formatMoney(row.overduePence)}
                  </span>
                </p>
              </div>
            ))}
          </div>

          {data.urgentInvoices.length > 0 ? (
            <div className="border-t border-line pt-1">
              <p className="mb-2 pt-3 text-[11.5px] font-bold uppercase tracking-wide text-ink-400">
                Needs attention
              </p>
              <ul className="divide-y divide-line" role="list">
                {data.urgentInvoices.map((invoice) => (
                  <li key={invoice.invoiceId}>
                    <Link
                      href={invoice.href}
                      className="flex items-start gap-3 py-3 transition-colors hover:bg-soft/40 -mx-1 rounded-xl px-1"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink-900">
                          {invoice.invoiceId.toUpperCase()} · {invoice.contactName}
                        </p>
                        <p className="mt-0.5 text-[12px] font-medium text-ink-500">
                          Due {invoice.dueDate}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <p className="tnum text-[13px] font-extrabold text-ink-900">
                          {formatMoney(invoice.amountDuePence)}
                        </p>
                        <StatusPill
                          status={invoice.status === 'overdue' ? 'Overdue' : 'Due soon'}
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </WidgetShell>
  );
}
