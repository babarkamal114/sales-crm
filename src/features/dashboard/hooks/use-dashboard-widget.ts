'use client';

import { useQuery } from '@tanstack/react-query';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import type { DashboardWidgetName } from '@/domain/dashboard/schemas';
import {
  DashboardApiError,
  fetchDashboardWidget,
  type DashboardWidgetResponseMap,
} from '@/features/dashboard/lib/api';
import { dashboardKeys } from '@/features/dashboard/query-keys';

export function useDashboardWidget<K extends DashboardWidgetName>(
  widget: K,
  filters: DashboardFiltersInput,
  scenario?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: dashboardKeys.widget(widget, filters, scenario),
    queryFn: ({ signal }) =>
      fetchDashboardWidget(widget, filters, scenario, signal),
    placeholderData: (previous) => previous,
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
    refetchOnMount: false,
  });
}

export function isDashboardWidgetForbidden(error: unknown): boolean {
  return error instanceof DashboardApiError && error.status === 403;
}

export type { DashboardWidgetResponseMap };
