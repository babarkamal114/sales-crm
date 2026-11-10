import 'server-only';

import type { DashboardScenario } from '@/domain/dashboard/schemas';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import type { DashboardBootstrapResponse } from '@/domain/dashboard/bootstrap-types';
import type { CrmSession } from '@/server/auth/session-types';
import {
  getDashboardActivity,
  getDashboardConversations,
  getDashboardKpis,
  getDashboardNextCall,
  getDashboardNudge,
  getDashboardPayments,
  getDashboardPipeline,
  getDashboardSources,
  getDashboardTasks,
  getDashboardTeam,
  getDashboardWelcome,
} from '@/server/services/dashboard/fixture-service';

/** One session, all dashboard fixture payloads — avoids N API routes × N DB session reads. */
export async function loadDashboardBootstrap(
  session: CrmSession,
  filters: DashboardFiltersInput,
  scenario?: DashboardScenario,
): Promise<DashboardBootstrapResponse> {
  const welcome = await getDashboardWelcome(session, scenario);

  const widgets = {
    kpis: getDashboardKpis(session, filters, scenario),
    pipeline: getDashboardPipeline(session, filters, scenario),
    tasks: getDashboardTasks(session, filters, scenario),
    conversations: getDashboardConversations(session, filters, scenario),
    sources: getDashboardSources(session, filters, scenario),
    payments: getDashboardPayments(session, filters, scenario),
    activity: getDashboardActivity(session, filters, scenario),
    nudge: getDashboardNudge(session, filters, scenario),
    'next-call': getDashboardNextCall(session, filters, scenario),
  };

  const teamResult = getDashboardTeam(session, filters, scenario);

  return {
    welcome,
    widgets: {
      ...widgets,
      ...('forbidden' in teamResult ? {} : { team: teamResult }),
    },
  };
}
