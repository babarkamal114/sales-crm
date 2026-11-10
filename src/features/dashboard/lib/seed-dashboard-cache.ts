import type { QueryClient } from '@tanstack/react-query';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import type { DashboardBootstrapResponse } from '@/domain/dashboard/bootstrap-types';
import { DASHBOARD_BOOTSTRAP_WIDGET_NAMES } from '@/domain/dashboard/bootstrap-types';
import { dashboardKeys } from '@/features/dashboard/query-keys';

export function seedDashboardQueryCache(
  queryClient: QueryClient,
  filters: DashboardFiltersInput,
  scenario: string | undefined,
  bootstrap: DashboardBootstrapResponse,
): void {
  queryClient.setQueryData(dashboardKeys.welcome(scenario), bootstrap.welcome);

  for (const name of DASHBOARD_BOOTSTRAP_WIDGET_NAMES) {
    queryClient.setQueryData(
      dashboardKeys.widget(name, filters, scenario),
      bootstrap.widgets[name],
    );
  }

  if (bootstrap.widgets.team) {
    queryClient.setQueryData(
      dashboardKeys.widget('team', filters, scenario),
      bootstrap.widgets.team,
    );
  }
}
