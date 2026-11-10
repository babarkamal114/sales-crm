import { NextResponse, type NextRequest } from 'next/server';
import { parseForecastQuery } from '@/domain/opportunities/forecast-query';
import { getActiveSession } from '@/server/auth/require-session';
import { handleApiError } from '@/server/api/json-error';
import { withTenant } from '@/server/db/with-tenant';
import { loadPipelineForecast } from '@/server/services/opportunities/load-pipeline-forecast';

type RouteContext = { params: Promise<{ pipelineId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { pipelineId } = await context.params;
  const parsed = parseForecastQuery(request.nextUrl.searchParams);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  try {
    const forecast = await withTenant(session, (tx) =>
      loadPipelineForecast(tx, session, pipelineId, parsed.data),
    );
    return NextResponse.json({ forecast }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return handleApiError(error);
  }
}
