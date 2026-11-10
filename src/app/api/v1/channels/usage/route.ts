import { NextResponse } from 'next/server';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { getUsageOverview } from '@/server/services/channels/get-usage-overview';

export async function GET() {
  try {
    const session = await requireSession();
    const overview = await withTenant(session, (tx) => getUsageOverview(tx, session));
    return NextResponse.json(overview);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
