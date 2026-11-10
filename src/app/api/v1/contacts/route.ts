import { NextResponse, type NextRequest } from 'next/server';
import { parseContactsDevScenario } from '@/domain/contacts/dev-scenario';
import { parseContactListQuery } from '@/domain/contacts/list-query';
import { getActiveSession } from '@/server/auth/require-session';
import { ForbiddenError } from '@/server/access/capabilities';
import { withTenant } from '@/server/db/with-tenant';
import { getContactsListFixture } from '@/server/services/contacts/contacts-fixture-service';
import { getContactListSummary, listContacts } from '@/server/services/contacts/list-contacts';

export async function GET(request: NextRequest) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const parsed = parseContactListQuery(request.nextUrl.searchParams);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  try {
    const devScenario = parseContactsDevScenario(request.nextUrl.searchParams);
    if (devScenario) {
      const fixture = getContactsListFixture(devScenario);
      const summaryOnly = request.nextUrl.searchParams.get('summary') === '1';
      if (summaryOnly) {
        return NextResponse.json(
          { summary: fixture.summary },
          { headers: { 'Cache-Control': 'private, no-store', 'X-Contacts-Fixture': devScenario } },
        );
      }
      return NextResponse.json(
        { summary: fixture.summary, ...fixture.list },
        { headers: { 'Cache-Control': 'private, no-store', 'X-Contacts-Fixture': devScenario } },
      );
    }

    const summaryOnly = request.nextUrl.searchParams.get('summary') === '1';
    const payload = await withTenant(session, async (tx) => {
      if (summaryOnly) {
        return { summary: await getContactListSummary(tx, session) };
      }
      const [summary, list] = await Promise.all([
        getContactListSummary(tx, session),
        listContacts(tx, session, parsed.data),
      ]);
      return { summary, ...list };
    });
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
