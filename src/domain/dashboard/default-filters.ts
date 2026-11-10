import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';

export type DashboardDefaultRole = 'admin' | 'manager' | 'member';

export function defaultDashboardFilters(
  role: DashboardDefaultRole,
): DashboardFiltersInput {
  return {
    pipeline: 'all',
    period: 'month',
    scope: role === 'member' ? 'mine' : 'team',
  };
}
