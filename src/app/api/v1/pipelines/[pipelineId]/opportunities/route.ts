import { NextResponse, type NextRequest } from 'next/server';
import { parseOpportunityListQuery } from '@/domain/opportunities/list-query';
import { getActiveSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { listPipelineOpportunities } from '@/server/services/opportunities/list-opportunities';

type RouteContext = { params: Promise<{ pipelineId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { pipelineId } = await context.params;
  const parsed = parseOpportunityListQuery(request.nextUrl.searchParams);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  const cursor = request.nextUrl.searchParams.get('cursor');
  const result = await withTenant(session, (tx) =>
    listPipelineOpportunities(tx, session, pipelineId, parsed.data, cursor),
  );

  return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
}
