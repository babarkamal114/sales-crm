import 'server-only';

import type { DashboardScenario } from '@/domain/dashboard/schemas';
import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
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
import { buildDashboardFilters } from '@/features/dashboard/lib/period-bounds';
import {
  populatedActivity,
  populatedConversations,
  populatedKpis,
  populatedNextCall,
  populatedNudge,
  populatedPayments,
  populatedPipeline,
  populatedSources,
  populatedTasks,
  populatedTeam,
} from '@/features/dashboard/fixtures/populated';
import { welcomePreviewSnapshot } from '@/domain/dashboard/welcome-fixtures';
import { resolveWelcomeResponse } from '@/domain/dashboard/welcome-resolve';
import type { CrmSession } from '@/server/auth/session-types';

function effectiveScenario(
  scenario: DashboardScenario | undefined,
  session: CrmSession,
): DashboardScenario {
  if (scenario) return scenario;
  if (session.role === 'member') return 'member';
  return 'populated';
}

function filtersForSession(
  input: DashboardFiltersInput,
  session: CrmSession,
): ReturnType<typeof buildDashboardFilters> {
  const scope = session.role === 'member' ? 'mine' : input.scope;
  return buildDashboardFilters({ ...input, scope });
}

export async function getDashboardWelcome(
  session: CrmSession,
  scenario?: DashboardScenario,
): Promise<DashboardWelcomeResponse> {
  if (scenario === 'new-org' || scenario === 'empty' || scenario === 'member') {
    return resolveWelcomeResponse({
      scenario,
      role: session.role,
      snapshot: welcomePreviewSnapshot(),
    });
  }

  if (
    scenario === 'populated' ||
    scenario === 'module-unavailable' ||
    scenario === 'stripe-disconnected' ||
    scenario === 'error-kpis' ||
    scenario === 'slow-pipeline'
  ) {
    return resolveWelcomeResponse({
      scenario,
      role: session.role,
      snapshot: welcomePreviewSnapshot(),
    });
  }

  if (!scenario) {
    const { welcomeWithoutDb } = await import(
      '@/server/services/dashboard/welcome-fast-path'
    );
    const fast = welcomeWithoutDb(session);
    if (fast) return fast;
  }

  const { withTenant } = await import('@/server/db/with-tenant');
  const { buildWelcomeFromDb } = await import(
    '@/server/services/dashboard/welcome-service'
  );

  return withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    (tx) => buildWelcomeFromDb(tx, session.orgId, session.userId, session.role),
  );
}

export function getDashboardKpis(
  session: CrmSession,
  input: DashboardFiltersInput,
  scenario?: DashboardScenario,
): DashboardKpisResponse {
  const effective = effectiveScenario(scenario, session);
  const filters = filtersForSession(input, session);

  if (effective === 'module-unavailable') {
    return {
      filters,
      moduleAvailable: false,
      openPipeline: {
        valuePence: 0,
        openCount: 0,
        sparkline: [],
        href: '/opportunities',
      },
      wonThisPeriod: {
        valuePence: 0,
        wonCount: 0,
        delta: { direction: 'flat', label: 'Not available' },
        sparkline: [],
        href: '/opportunities',
      },
      newLeads: {
        count: 0,
        topSources: [],
        delta: { direction: 'flat', label: 'Not available' },
        sparkline: [],
        href: '/contacts',
      },
      tasksDueToday: {
        openDueToday: 0,
        overdueCount: 0,
        completedToday: 0,
        progressRatio: 0,
        sparkline: [],
        href: '/tasks',
        moduleAvailable: false,
      },
      headerCounts: { tasksDueToday: 0, unreadMessages: 0 },
    };
  }

  if (effective === 'empty') {
    const base = populatedKpis(filters);
    return {
      ...base,
      openPipeline: {
        ...base.openPipeline,
        valuePence: 0,
        openCount: 0,
        delta: { direction: 'flat', label: 'No change' },
      },
      wonThisPeriod: {
        ...base.wonThisPeriod,
        valuePence: 0,
        wonCount: 0,
        delta: { direction: 'flat', label: 'No change' },
      },
      newLeads: {
        ...base.newLeads,
        count: 0,
        topSources: [],
        delta: { direction: 'flat', label: 'No change' },
      },
      tasksDueToday: {
        ...base.tasksDueToday,
        openDueToday: 0,
        overdueCount: 0,
        completedToday: 0,
        progressRatio: 0,
      },
      headerCounts: { tasksDueToday: 0, unreadMessages: 0 },
    };
  }

  return populatedKpis(filters);
}

export function getDashboardPipeline(
  session: CrmSession,
  input: DashboardFiltersInput,
  scenario?: DashboardScenario,
): DashboardPipelineResponse {
  const filters = filtersForSession(input, session);
  const effective = effectiveScenario(scenario, session);
  if (effective === 'module-unavailable') {
    return {
      filters,
      moduleAvailable: false,
      pipelineId: 'none',
      pipelineName: 'Pipeline',
      pipelineSelector: [],
      stages: [],
      footer: {
        leadToWonPercent: null,
        averageWonDealPence: null,
        averageDaysToWin: null,
        awaitingDecisionPence: 0,
      },
      boardHref: '/opportunities',
    };
  }
  if (effective === 'empty') {
    const base = populatedPipeline(filters);
    return { ...base, stages: [], footer: { ...base.footer, awaitingDecisionPence: 0 } };
  }
  return populatedPipeline(filters);
}

export function getDashboardTasks(
  session: CrmSession,
  input: DashboardFiltersInput,
  scenario?: DashboardScenario,
): DashboardTasksResponse {
  const filters = filtersForSession(input, session);
  const effective = effectiveScenario(scenario, session);
  if (effective === 'module-unavailable') {
    return {
      filters,
      moduleAvailable: false,
      progress: { completedToday: 0, openDueToday: 0, overdueCount: 0, ratio: 0 },
      items: [],
      totalCount: 0,
      viewAllHref: '/tasks',
    };
  }
  if (effective === 'empty') {
    return {
      filters,
      moduleAvailable: true,
      progress: { completedToday: 0, openDueToday: 0, overdueCount: 0, ratio: 0 },
      items: [],
      totalCount: 0,
      viewAllHref: '/tasks',
    };
  }
  return populatedTasks(filters);
}

export function getDashboardConversations(
  session: CrmSession,
  input: DashboardFiltersInput,
  scenario?: DashboardScenario,
): DashboardConversationsResponse {
  const filters = filtersForSession(input, session);
  const effective = effectiveScenario(scenario, session);
  if (effective === 'module-unavailable') {
    return { filters, moduleAvailable: false, items: [], inboxHref: '/contacts' };
  }
  if (effective === 'empty') {
    return { filters, moduleAvailable: true, items: [], inboxHref: '/contacts' };
  }
  return populatedConversations(filters);
}

export function getDashboardSources(
  session: CrmSession,
  input: DashboardFiltersInput,
  scenario?: DashboardScenario,
): DashboardSourcesResponse {
  const filters = filtersForSession(input, session);
  const effective = effectiveScenario(scenario, session);
  if (effective === 'module-unavailable' || effective === 'empty') {
    return {
      filters,
      moduleAvailable: effective !== 'module-unavailable',
      totalContacts: 0,
      segments: [],
      accessibleSummary: 'No lead sources in this period',
    };
  }
  return populatedSources(filters);
}

export function getDashboardPayments(
  session: CrmSession,
  input: DashboardFiltersInput,
  scenario?: DashboardScenario,
): DashboardPaymentsResponse {
  const filters = filtersForSession(input, session);
  const effective = effectiveScenario(scenario, session);
  const canConnectStripe = session.role === 'admin';

  if (effective === 'module-unavailable') {
    return {
      filters,
      moduleAvailable: false,
      stripeConnected: false,
      canConnectStripe,
      totalsByCurrency: [],
      urgentInvoices: [],
    };
  }

  if (effective === 'stripe-disconnected') {
    return {
      filters,
      moduleAvailable: true,
      stripeConnected: false,
      canConnectStripe,
      totalsByCurrency: [],
      urgentInvoices: [],
    };
  }

  if (effective === 'empty') {
    return {
      filters,
      moduleAvailable: true,
      stripeConnected: true,
      canConnectStripe,
      totalsByCurrency: [
        { currency: 'GBP', paidThisPeriodPence: 0, dueWithin7DaysPence: 0, overduePence: 0 },
      ],
      urgentInvoices: [],
    };
  }

  return populatedPayments(filters, canConnectStripe);
}

export function getDashboardActivity(
  session: CrmSession,
  input: DashboardFiltersInput,
  scenario?: DashboardScenario,
): DashboardActivityResponse {
  const filters = filtersForSession(input, session);
  const effective = effectiveScenario(scenario, session);
  if (effective === 'module-unavailable' || effective === 'empty') {
    return {
      filters,
      moduleAvailable: effective !== 'module-unavailable',
      items: [],
      viewAllHref: '/activity',
    };
  }
  return populatedActivity(filters);
}

export function getDashboardTeam(
  session: CrmSession,
  input: DashboardFiltersInput,
  scenario?: DashboardScenario,
): DashboardTeamResponse | { forbidden: true } {
  if (session.role === 'member') {
    return { forbidden: true };
  }
  const filters = filtersForSession(input, session);
  const effective = effectiveScenario(scenario, session);
  if (effective === 'module-unavailable' || effective === 'empty') {
    return {
      filters,
      moduleAvailable: effective !== 'module-unavailable',
      metric: 'won_value',
      members: [],
    };
  }
  return populatedTeam(filters);
}

export function getDashboardNudge(
  session: CrmSession,
  input: DashboardFiltersInput,
  scenario?: DashboardScenario,
): DashboardNudgeResponse {
  const filters = filtersForSession(input, session);
  const effective = effectiveScenario(scenario, session);
  if (effective === 'empty' || effective === 'module-unavailable') {
    return {
      filters,
      moduleAvailable: effective !== 'module-unavailable',
      count: 0,
      href: '/opportunities?filter=no-next-step',
    };
  }
  return populatedNudge(filters);
}

export function getDashboardNextCall(
  session: CrmSession,
  input: DashboardFiltersInput,
  scenario?: DashboardScenario,
): DashboardNextCallResponse {
  const filters = filtersForSession(input, session);
  const effective = effectiveScenario(scenario, session);
  if (effective === 'module-unavailable' || effective === 'empty') {
    return { filters, moduleAvailable: false, callingEnabled: false };
  }
  return populatedNextCall(filters);
}
