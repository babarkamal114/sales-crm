import { NextResponse } from 'next/server';
import { getActiveSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { listAccessiblePipelines } from '@/server/services/opportunities/opportunity-board';

export async function GET() {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const pipelines = await withTenant(session, (tx) =>
    listAccessiblePipelines(tx, session),
  );

  return NextResponse.json({ pipelines }, { headers: { 'Cache-Control': 'private, no-store' } });
}
