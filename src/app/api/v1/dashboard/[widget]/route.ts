import { NextResponse } from 'next/server';
import {
  dashboardFiltersSchema,
  dashboardScenarioSchema,
  dashboardWidgetSchema,
} from '@/domain/dashboard/schemas';
import { getActiveSession } from '@/server/auth/require-session';
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
} from '@/server/services/dashboard/fixture-service';

function parseFilters(searchParams: URLSearchParams) {
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

export async function GET(
  request: Request,
  context: { params: Promise<{ widget: string }> },
) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { widget: widgetParam } = await context.params;
  const widgetParsed = dashboardWidgetSchema.safeParse(widgetParam);
  if (!widgetParsed.success) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const filtersParsed = parseFilters(url.searchParams);
  if (!filtersParsed.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 422 });
  }

  let scenario: ReturnType<typeof dashboardScenarioSchema.parse> | undefined;
  const scenarioParam = url.searchParams.get('scenario');
  if (scenarioParam) {
    const parsedScenario = dashboardScenarioSchema.safeParse(scenarioParam);
    if (parsedScenario.success) {
      scenario = parsedScenario.data;
    }
  }

  const widget = widgetParsed.data;
  const filters = filtersParsed.data;

  if (widget === 'team') {
    const team = getDashboardTeam(session, filters, scenario);
    if ('forbidden' in team) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(team);
  }

  const handlers = {
    kpis: () => getDashboardKpis(session, filters, scenario),
    pipeline: () => getDashboardPipeline(session, filters, scenario),
    tasks: () => getDashboardTasks(session, filters, scenario),
    conversations: () => getDashboardConversations(session, filters, scenario),
    sources: () => getDashboardSources(session, filters, scenario),
    payments: () => getDashboardPayments(session, filters, scenario),
    activity: () => getDashboardActivity(session, filters, scenario),
    nudge: () => getDashboardNudge(session, filters, scenario),
    'next-call': () => getDashboardNextCall(session, filters, scenario),
  } as const;

  return NextResponse.json(handlers[widget]());
}
