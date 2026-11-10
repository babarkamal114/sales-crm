import { NextResponse } from 'next/server';
import { handleApiError } from '@/server/api/json-error';
import { parseBoardFilters } from '@/domain/opportunities/filters';
import { getActiveSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { listStageOpportunityCards } from '@/server/services/opportunities/opportunity-board';

type RouteContext = {
  params: Promise<{ pipelineId: string; stageId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { pipelineId, stageId } = await context.params;
  const url = new URL(request.url);
  const filtersParsed = parseBoardFilters(url.searchParams);
  if (!filtersParsed.success) {
    return NextResponse.json({ error: 'Invalid filters' }, { status: 422 });
  }

  const cursor = url.searchParams.get('cursor');

  try {
    const page = await withTenant(session, (tx) =>
      listStageOpportunityCards(
        tx,
        session,
        pipelineId,
        stageId,
        filtersParsed.data,
        cursor,
      ),
    );

    return NextResponse.json(page, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
