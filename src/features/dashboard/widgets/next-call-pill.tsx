'use client';

import Link from 'next/link';
import { Phone } from 'lucide-react';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import { Button } from '@/components/ui/button';
import { useDashboardWidget } from '@/features/dashboard/hooks/use-dashboard-widget';

export function NextCallPill({
  filters,
  scenario,
}: {
  filters: DashboardFiltersInput;
  scenario?: string;
}) {
  const { data } = useDashboardWidget('next-call', filters, scenario);

  if (!data?.item || !data.moduleAvailable) return null;

  return (
    <div
      className="fixed right-4 bottom-4 left-4 z-40 flex items-center gap-3 rounded-2xl border border-white bg-white/90 p-2.5 pl-4 shadow-float backdrop-blur-sm sm:left-auto sm:max-w-md"
      role="region"
      aria-label="Next call"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-ink-500">Next call</p>
        <p className="truncate text-[13px] font-semibold text-ink-900">
          {data.item.contactName}
          {data.item.companyName ? ` · ${data.item.companyName}` : ''}
        </p>
      </div>
      <Button
        type="button"
        variant="primary"
        size="icon"
        className="shrink-0 bg-mint-500 hover:bg-mint-600"
        disabled={!data.callingEnabled}
        aria-label={`Call ${data.item.contactName}`}
        asChild={data.callingEnabled}
      >
        {data.callingEnabled ? (
          <Link href={data.item.href}>
            <Phone className="size-[18px]" />
          </Link>
        ) : (
          <Phone className="size-[18px]" />
        )}
      </Button>
    </div>
  );
}
