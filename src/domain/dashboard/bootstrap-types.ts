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

export type DashboardBootstrapWidgets = {
  kpis: DashboardKpisResponse;
  pipeline: DashboardPipelineResponse;
  tasks: DashboardTasksResponse;
  conversations: DashboardConversationsResponse;
  sources: DashboardSourcesResponse;
  payments: DashboardPaymentsResponse;
  activity: DashboardActivityResponse;
  nudge: DashboardNudgeResponse;
  'next-call': DashboardNextCallResponse;
  team?: DashboardTeamResponse;
};

export type DashboardBootstrapResponse = {
  welcome: DashboardWelcomeResponse;
  widgets: DashboardBootstrapWidgets;
};

export const DASHBOARD_BOOTSTRAP_WIDGET_NAMES = [
  'kpis',
  'pipeline',
  'tasks',
  'conversations',
  'sources',
  'payments',
  'activity',
  'nudge',
  'next-call',
] as const satisfies readonly DashboardWidgetName[];
