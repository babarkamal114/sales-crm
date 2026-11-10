import type { QueryClient } from '@tanstack/react-query';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import type { DashboardBootstrapResponse } from '@/domain/dashboard/bootstrap-types';
import { DashboardApiError } from '@/features/dashboard/lib/api';
import { seedDashboardQueryCache } from '@/features/dashboard/lib/seed-dashboard-cache';

function buildQuery(filters: DashboardFiltersInput, scenario?: string): string {
  const params = new URLSearchParams({
    pipeline: filters.pipeline,
    period: filters.period,
    scope: filters.scope,
  });
  if (filters.viewAsUser) {
    params.set('viewAsUser', filters.viewAsUser);
  }
  if (scenario) {
    params.set('scenario', scenario);
  }
  return params.toString();
}

export async function fetchDashboardBootstrap(
  queryClient: QueryClient,
  filters: DashboardFiltersInput,
  scenario?: string,
  signal?: AbortSignal,
): Promise<DashboardBootstrapResponse> {
  const query = buildQuery(filters, scenario);
  const response = await fetch(`/api/v1/dashboard/bootstrap?${query}`, {
    credentials: 'same-origin',
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new DashboardApiError(response.status, `Bootstrap failed (${response.status})`);
  }
  const data = (await response.json()) as DashboardBootstrapResponse;
  seedDashboardQueryCache(queryClient, filters, scenario, data);
  return data;
}
