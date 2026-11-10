import { NextResponse, type NextRequest } from 'next/server';
import { parseContactListQuery } from '@/domain/contacts/list-query';
import { getActiveSession } from '@/server/auth/require-session';
import { ForbiddenError } from '@/server/access/capabilities';
import { withTenant } from '@/server/db/with-tenant';
import { listContactIdsForQuery } from '@/server/services/contacts/list-contacts';

export async function GET(request: NextRequest) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const parsed = parseContactListQuery(request.nextUrl.searchParams);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  const max = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 500), 500);

  try {
    const ids = await withTenant(session, (tx) =>
      listContactIdsForQuery(tx, session, parsed.data, max),
    );
    return NextResponse.json({ ids, capped: ids.length >= max }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
