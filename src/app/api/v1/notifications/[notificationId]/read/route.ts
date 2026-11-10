import { NextResponse } from 'next/server';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { markOrgUserNotificationRead } from '@/server/services/notifications/org-user-notifications';

type Params = { params: Promise<{ notificationId: string }> };

export async function POST(_request: Request, { params }: Params) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { notificationId } = await params;

  await withTenant(session, (tx) =>
    markOrgUserNotificationRead(tx, session, notificationId),
  );

  return NextResponse.json({ ok: true });
}
