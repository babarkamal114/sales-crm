'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import { fetchDashboardBootstrap } from '@/features/dashboard/lib/bootstrap-api';
import { dashboardKeys } from '@/features/dashboard/query-keys';

const BOOTSTRAP_STALE_MS = 60_000;

export function useDashboardBootstrap(
  filters: DashboardFiltersInput,
  scenario?: string,
) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: dashboardKeys.bootstrap(filters, scenario),
    queryFn: ({ signal }) =>
      fetchDashboardBootstrap(queryClient, filters, scenario, signal),
    staleTime: BOOTSTRAP_STALE_MS,
    gcTime: 5 * 60_000,
    placeholderData: (previous) => previous,
  });
}
