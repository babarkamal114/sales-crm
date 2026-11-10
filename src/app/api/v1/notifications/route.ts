import { NextResponse } from 'next/server';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { listOrgUserNotifications } from '@/server/services/notifications/org-user-notifications';

export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const items = await withTenant(session, (tx) => listOrgUserNotifications(tx, session));
  return NextResponse.json({ items });
}
