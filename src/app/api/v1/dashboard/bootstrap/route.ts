import { NextResponse } from 'next/server';
import { getActiveSession } from '@/server/auth/require-session';
import {
  parseDashboardFiltersFromSearchParams,
  parseDashboardScenario,
} from '@/server/api/dashboard-query';
import { loadDashboardBootstrap } from '@/server/services/dashboard/load-dashboard-bootstrap';

export async function GET(request: Request) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const filtersParsed = parseDashboardFiltersFromSearchParams(url.searchParams);
  if (!filtersParsed.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 422 });
  }

  const scenario = parseDashboardScenario(url.searchParams);
  const payload = await loadDashboardBootstrap(session, filtersParsed.data, scenario);

  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': 'private, no-store',
    },
  });
}
