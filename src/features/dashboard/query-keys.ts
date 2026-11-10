import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import type { DashboardWidgetName } from '@/domain/dashboard/schemas';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  welcome: (scenario?: string) =>
    [...dashboardKeys.all, 'welcome', scenario ?? 'default'] as const,
  widget: (
    name: DashboardWidgetName,
    filters: DashboardFiltersInput,
    scenario?: string,
  ) =>
    [
      ...dashboardKeys.all,
      name,
      filters.pipeline,
      filters.period,
      filters.scope,
      filters.viewAsUser ?? '',
      scenario ?? 'default',
    ] as const,
  bootstrap: (filters: DashboardFiltersInput, scenario?: string) =>
    [
      ...dashboardKeys.all,
      'bootstrap',
      filters.pipeline,
      filters.period,
      filters.scope,
      filters.viewAsUser ?? '',
      scenario ?? 'default',
    ] as const,
};
