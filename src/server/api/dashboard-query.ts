import type { DashboardScenario } from '@/domain/dashboard/schemas';
import { dashboardFiltersSchema, dashboardScenarioSchema } from '@/domain/dashboard/schemas';

export function parseDashboardFiltersFromSearchParams(
  searchParams: URLSearchParams,
): ReturnType<typeof dashboardFiltersSchema.safeParse> {
  const pipeline = searchParams.get('pipeline') ?? 'all';
  const period = searchParams.get('period') ?? 'month';
  const scope = searchParams.get('scope') ?? 'team';
  const viewAsUser = searchParams.get('viewAsUser') ?? undefined;

  return dashboardFiltersSchema.safeParse({
    pipeline,
    period,
    scope,
    viewAsUser,
  });
}

export function parseDashboardScenario(
  searchParams: URLSearchParams,
): DashboardScenario | undefined {
  const scenarioParam = searchParams.get('scenario');
  if (!scenarioParam) {
    return undefined;
  }
  const parsed = dashboardScenarioSchema.safeParse(scenarioParam);
  return parsed.success ? parsed.data : undefined;
}
