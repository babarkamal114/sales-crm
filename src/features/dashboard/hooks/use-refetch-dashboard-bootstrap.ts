'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import { fetchDashboardBootstrap } from '@/features/dashboard/lib/bootstrap-api';
export function useRefetchDashboardBootstrap(
  filters: DashboardFiltersInput,
  scenario?: string,
) {
  const queryClient = useQueryClient();

  return async () => {
    await fetchDashboardBootstrap(queryClient, filters, scenario);
  };
}
