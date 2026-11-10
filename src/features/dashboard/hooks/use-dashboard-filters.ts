'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import type { CrmRole } from '@/server/db/schema';

const PERIODS = ['today', 'week', 'month', 'quarter'] as const;
const SCOPES = ['mine', 'team'] as const;

export function useDashboardFilters(role: CrmRole) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const scenario = searchParams.get('scenario') ?? undefined;
  const canUseTeamScope = role === 'admin' || role === 'manager';

  const filters = useMemo((): DashboardFiltersInput => {
    const periodParam = searchParams.get('period');
    const scopeParam = searchParams.get('scope');
    const pipeline = searchParams.get('pipeline') ?? 'all';
    const viewAsUser = searchParams.get('viewAsUser') ?? undefined;

    const period = PERIODS.includes(periodParam as (typeof PERIODS)[number])
      ? (periodParam as DashboardFiltersInput['period'])
      : 'month';

    let scope: DashboardFiltersInput['scope'] =
      SCOPES.includes(scopeParam as (typeof SCOPES)[number])
        ? (scopeParam as DashboardFiltersInput['scope'])
        : canUseTeamScope
          ? 'team'
          : 'mine';

    if (!canUseTeamScope) {
      scope = 'mine';
    }

    return {
      pipeline,
      period,
      scope,
      ...(viewAsUser ? { viewAsUser } : {}),
    };
  }, [canUseTeamScope, searchParams]);

  const viewAsUserId = searchParams.get('viewAsUser') ?? undefined;

  const setFilters = useCallback(
    (patch: Partial<DashboardFiltersInput>) => {
      const params = new URLSearchParams(searchParams.toString());
      const next = { ...filters, ...patch };

      params.set('pipeline', next.pipeline);
      params.set('period', next.period);
      params.set('scope', next.scope);

      if (next.viewAsUser) {
        params.set('viewAsUser', next.viewAsUser);
      } else {
        params.delete('viewAsUser');
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [filters, pathname, router, searchParams],
  );

  const clearViewAs = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('viewAsUser');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  return {
    filters,
    scenario,
    canUseTeamScope,
    setFilters,
    clearViewAs,
    viewAsUserId,
  };
}
