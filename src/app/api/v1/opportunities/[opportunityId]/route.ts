import { NextResponse, type NextRequest } from 'next/server';
import { parseBoardFilters } from '@/domain/opportunities/filters';
import { parseOpportunityListQuery } from '@/domain/opportunities/list-query';
import { getActiveSession } from '@/server/auth/require-session';
import { ForbiddenError, NotFoundError } from '@/server/access/capabilities';
import { withTenant } from '@/server/db/with-tenant';
import { getOpportunityDetail } from '@/server/services/opportunities/get-opportunity-detail';

type RouteContext = { params: Promise<{ opportunityId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { opportunityId } = await context.params;
  const filtersParsed = parseBoardFilters(request.nextUrl.searchParams);
  const navFilters = filtersParsed.success
    ? filtersParsed.data
    : { owner: 'all' as const, status: 'open' as const, sort: 'manual' as const };
  const listParsed = parseOpportunityListQuery(request.nextUrl.searchParams);
  const listNav =
    listParsed.success && request.nextUrl.searchParams.get('listSort')
      ? listParsed.data
      : null;

  try {
    const detail = await withTenant(session, (tx) =>
      getOpportunityDetail(tx, session, opportunityId, navFilters, listNav),
    );
    return NextResponse.json({ opportunity: detail }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
