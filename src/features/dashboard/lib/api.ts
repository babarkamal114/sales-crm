import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import type { DashboardWidgetName } from '@/domain/dashboard/schemas';
import type {
  DashboardActivityResponse,
  DashboardConversationsResponse,
  DashboardKpisResponse,
  DashboardNextCallResponse,
  DashboardNudgeResponse,
  DashboardPaymentsResponse,
  DashboardPipelineResponse,
  DashboardSourcesResponse,
  DashboardTasksResponse,
  DashboardTeamResponse,
  DashboardWelcomeResponse,
} from '@/domain/dashboard/types';

export class DashboardApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function buildQuery(
  filters: DashboardFiltersInput,
  scenario?: string,
): string {
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

async function apiGet<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new DashboardApiError(response.status, `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

const responseByWidget = {
  kpis: null as unknown as DashboardKpisResponse,
  pipeline: null as unknown as DashboardPipelineResponse,
  tasks: null as unknown as DashboardTasksResponse,
  conversations: null as unknown as DashboardConversationsResponse,
  sources: null as unknown as DashboardSourcesResponse,
  payments: null as unknown as DashboardPaymentsResponse,
  activity: null as unknown as DashboardActivityResponse,
  team: null as unknown as DashboardTeamResponse,
  nudge: null as unknown as DashboardNudgeResponse,
  'next-call': null as unknown as DashboardNextCallResponse,
};

export type DashboardWidgetResponseMap = {
  [K in DashboardWidgetName]: (typeof responseByWidget)[K];
};

export async function fetchDashboardWidget<K extends DashboardWidgetName>(
  widget: K,
  filters: DashboardFiltersInput,
  scenario?: string,
  signal?: AbortSignal,
): Promise<DashboardWidgetResponseMap[K]> {
  const query = buildQuery(filters, scenario);
  return apiGet<DashboardWidgetResponseMap[K]>(
    `/api/v1/dashboard/${widget}?${query}`,
    signal,
  );
}

export async function fetchDashboardWelcome(
  scenario?: string,
  signal?: AbortSignal,
): Promise<DashboardWelcomeResponse> {
  const query = scenario ? `?scenario=${encodeURIComponent(scenario)}` : '';
  return apiGet<DashboardWelcomeResponse>(
    `/api/v1/dashboard/welcome${query}`,
    signal,
  );
}
