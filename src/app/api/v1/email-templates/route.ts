import { NextResponse } from 'next/server';
import { getActiveSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { listContactEmailTemplates } from '@/server/services/contacts/contact-email-templates';

export async function GET() {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const items = await withTenant(session, (tx) => listContactEmailTemplates(tx, session));
  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'private, no-store' } });
}
