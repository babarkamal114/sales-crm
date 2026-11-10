import { NextResponse } from 'next/server';
import { handleApiError } from '@/server/api/json-error';
import { parseBoardFilters } from '@/domain/opportunities/filters';
import { getActiveSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import {
  listPipelineStages,
  loadBoardSummary,
  loadBoardTotals,
} from '@/server/services/opportunities/opportunity-board';

type RouteContext = { params: Promise<{ pipelineId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { pipelineId } = await context.params;
  const url = new URL(request.url);
  const filtersParsed = parseBoardFilters(url.searchParams);
  if (!filtersParsed.success) {
    return NextResponse.json({ error: 'Invalid filters' }, { status: 422 });
  }

  try {
    const payload = await withTenant(session, async (tx) => {
      const [stages, summaries, totals] = await Promise.all([
        listPipelineStages(tx, session, pipelineId),
        loadBoardSummary(tx, session, pipelineId, filtersParsed.data),
        loadBoardTotals(tx, session, pipelineId, filtersParsed.data),
      ]);
      return { stages, summaries, totals };
    });

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
