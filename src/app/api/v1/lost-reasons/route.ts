import { NextResponse } from 'next/server';
import { getActiveSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { listLostReasons } from '@/server/services/opportunities/list-lost-reasons';

export async function GET() {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const reasons = await withTenant(session, (tx) => listLostReasons(tx, session));
  return NextResponse.json({ reasons }, { headers: { 'Cache-Control': 'private, no-store' } });
}
