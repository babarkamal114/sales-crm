import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getActiveSession } from '@/server/auth/require-session';
import { handleApiError } from '@/server/api/json-error';
import { withTenant } from '@/server/db/with-tenant';
import { listSavedViews } from '@/server/services/opportunities/saved-views';

type RouteContext = { params: Promise<{ pipelineId: string }> };

const scopeSchema = z.enum(['board', 'list']);

export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { pipelineId } = await context.params;
  const scopeRaw = request.nextUrl.searchParams.get('scope') ?? 'board';
  const scopeParsed = scopeSchema.safeParse(scopeRaw);
  if (!scopeParsed.success) {
    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
  }

  try {
    const views = await withTenant(session, (tx) =>
      listSavedViews(tx, session, pipelineId, scopeParsed.data),
    );
    return NextResponse.json({ views }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return handleApiError(error);
  }
}
