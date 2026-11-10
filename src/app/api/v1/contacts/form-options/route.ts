import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getActiveSession } from '@/server/auth/require-session';
import { organisationSettings } from '@/server/db/schema';
import { withTenant } from '@/server/db/with-tenant';

export async function GET() {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const options = await withTenant(session, async (tx) => {
    const [row] = await tx
      .select({ collectContactDateOfBirth: organisationSettings.collectContactDateOfBirth })
      .from(organisationSettings)
      .where(eq(organisationSettings.orgId, session.orgId))
      .limit(1);
    return { collectContactDateOfBirth: row?.collectContactDateOfBirth ?? false };
  });

  return NextResponse.json(options);
}
