import { NextResponse, type NextRequest } from 'next/server';
import { NotFoundError } from '@/server/access/capabilities';
import { getActiveSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { getContactDealPrefill } from '@/server/services/opportunities/contact-deal-prefill';

type RouteContext = { params: Promise<{ contactId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const { contactId } = await context.params;

  try {
    const prefill = await withTenant(session, (tx) =>
      getContactDealPrefill(tx, session, contactId),
    );
    return NextResponse.json(prefill);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
