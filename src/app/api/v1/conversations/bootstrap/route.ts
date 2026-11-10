import { NextResponse, type NextRequest } from 'next/server';
import { getActiveSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { getConversationsBootstrap } from '@/server/services/conversations/get-conversations-bootstrap';

export async function GET(request: NextRequest) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const selectedId = request.nextUrl.searchParams.get('c');

  const payload = await withTenant(session, (tx) =>
    getConversationsBootstrap(tx, session, selectedId),
  );

  return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, no-store' } });
}
