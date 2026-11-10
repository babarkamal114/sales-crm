'use client';

import type { CrmRole } from '@/server/db/schema';
import { DashboardHeader } from '@/features/dashboard/components/dashboard-header';
import { DashboardToolbar } from '@/features/dashboard/components/dashboard-toolbar';
import { GettingStartedBanner } from '@/features/dashboard/components/getting-started-banner';
import { DashboardMainGrid } from '@/features/dashboard/dashboard-main-grid';
import { useDashboardBootstrap } from '@/features/dashboard/hooks/use-dashboard-bootstrap';
import { useDashboardFilters } from '@/features/dashboard/hooks/use-dashboard-filters';
import { useDashboardWidget } from '@/features/dashboard/hooks/use-dashboard-widget';
import { Button } from '@/components/ui/button';
import { ContentPanel } from '@/components/layouts/app-header';
import { CrmContentLoading } from '@/components/layouts/crm-content-loading';

export function DashboardPageClient({
  fullName,
  role,
}: {
  fullName: string;
  role: CrmRole;
}) {
  const { filters, scenario, canUseTeamScope, setFilters, clearViewAs, viewAsUserId } =
    useDashboardFilters(role);

  const {
    data: bootstrap,
    isPending: bootstrapPending,
    isFetching: bootstrapFetching,
    isError: bootstrapError,
  } = useDashboardBootstrap(filters, scenario);

  const welcome = bootstrap?.welcome;
  const widgetsReady = Boolean(bootstrap) && !bootstrapError;

  const { data: kpis } = useDashboardWidget('kpis', filters, scenario, {
    enabled: widgetsReady,
  });

  const showInlineLoading = bootstrapPending && !bootstrap;

  return (
    <ContentPanel className="space-y-5 pb-28">
      <DashboardHeader
        fullName={fullName}
        tasksDueToday={kpis?.headerCounts.tasksDueToday ?? 0}
        unreadMessages={kpis?.headerCounts.unreadMessages ?? 0}
      />

      {viewAsUserId ? (
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-[12px] font-semibold text-brand-700">
            Viewing as selected teammate (read-only)
          </span>
          <Button type="button" variant="ghost" size="compact" onClick={clearViewAs}>
            Dismiss
          </Button>
        </div>
      ) : null}

      <DashboardToolbar
        filters={filters}
        canUseTeamScope={canUseTeamScope}
        liveConnected={false}
        onFiltersChange={setFilters}
      />

      {bootstrapFetching && bootstrap ? (
        <p className="sr-only" aria-live="polite">
          Updating dashboard
        </p>
      ) : null}

      {showInlineLoading ? <CrmContentLoading /> : null}

      {bootstrapError && !bootstrap ? (
        <p className="text-[13px] font-medium text-rose-600" role="alert">
          Could not load dashboard. Refresh the page to try again.
        </p>
      ) : null}

      {welcome ? <GettingStartedBanner welcome={welcome} /> : null}

      {widgetsReady ? (
        <DashboardMainGrid
          filters={filters}
          canUseTeamScope={canUseTeamScope}
          {...(scenario ? { scenario } : {})}
        />
      ) : null}
    </ContentPanel>
  );
}
