import { NextResponse, type NextRequest } from 'next/server';
import { getActiveSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { getPipelineCreateMeta } from '@/server/services/opportunities/pipeline-create-meta';
import { NotFoundError } from '@/server/access/capabilities';

type RouteContext = { params: Promise<{ pipelineId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { pipelineId } = await context.params;

  try {
    const meta = await withTenant(session, (tx) =>
      getPipelineCreateMeta(tx, session, pipelineId),
    );
    return NextResponse.json(meta);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
