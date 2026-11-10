'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import type { DashboardWelcomeResponse } from '@/domain/dashboard/types';
import { WelcomeChecklist } from '@/features/dashboard/welcome/welcome-checklist';
import { useRefetchDashboardBootstrap } from '@/features/dashboard/hooks/use-refetch-dashboard-bootstrap';
import { fetchDashboardWelcome } from '@/features/dashboard/lib/api';
import { dashboardKeys } from '@/features/dashboard/query-keys';
import type { CrmRole } from '@/server/db/schema';

export function WelcomePanel({
  welcome,
  scenario,
  filters,
  role,
}: {
  welcome?: DashboardWelcomeResponse;
  scenario?: string;
  filters: DashboardFiltersInput;
  role: CrmRole;
}) {
  const refetchBootstrap = useRefetchDashboardBootstrap(filters, scenario);

  const { data: fetched } = useQuery({
    queryKey: dashboardKeys.welcome(scenario),
    queryFn: () => fetchDashboardWelcome(scenario),
    enabled: welcome === undefined,
  });

  const data = welcome ?? fetched;

  if (!data?.showWelcome) return null;

  const title = data.title ?? 'Welcome to CRM';
  const subtitle =
    data.subtitle ??
    'Set up the basics below. Each step opens here on your dashboard and ticks off when you are done.';
  const { progress } = data;

  return (
    <Card className="border-line/60 shadow-panel">
      <CardContent className="pt-5">
        <div className="min-w-0">
          <h2 className="text-[24px] font-extrabold tracking-tight text-ink-900">{title}</h2>
          <p className="mt-1 max-w-2xl text-[13.5px] font-medium text-ink-500">{subtitle}</p>
          {progress && progress.total > 0 ? (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-2 text-[12px] font-semibold text-ink-600">
                <span aria-live="polite">
                  {progress.completed} of {progress.total} complete
                </span>
                <span className="text-brand-700">
                  {Math.round((progress.completed / progress.total) * 100)}%
                </span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-soft"
                role="progressbar"
                aria-valuenow={progress.completed}
                aria-valuemin={0}
                aria-valuemax={progress.total}
              >
                <div
                  className="h-full rounded-full bg-brand-500 transition-[width] duration-300"
                  style={{
                    width: `${(progress.completed / progress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <WelcomeChecklist
          items={data.checklist}
          role={role}
          onStepComplete={() => {
            void refetchBootstrap();
          }}
        />
      </CardContent>
    </Card>
  );
}
