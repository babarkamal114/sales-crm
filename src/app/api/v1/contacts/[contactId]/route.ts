import { NextResponse, type NextRequest } from 'next/server';
import { getActiveSession } from '@/server/auth/require-session';
import { ForbiddenError, NotFoundError } from '@/server/access/capabilities';
import { withTenant } from '@/server/db/with-tenant';
import { getContactQuickView } from '@/server/services/contacts/get-contact-quick-view';

type RouteContext = { params: Promise<{ contactId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { contactId } = await context.params;

  try {
    const contact = await withTenant(session, (tx) =>
      getContactQuickView(tx, session, contactId),
    );
    return NextResponse.json({ contact }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
