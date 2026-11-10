import { NextResponse } from 'next/server';
import { getActiveSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { getChannelsOverview } from '@/server/services/channels/get-channels-overview';

export async function GET() {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const overview = await withTenant(session, (tx) => getChannelsOverview(tx, session));
  return NextResponse.json(overview, { headers: { 'Cache-Control': 'private, no-store' } });
}
