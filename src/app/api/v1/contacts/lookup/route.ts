import { NextResponse, type NextRequest } from 'next/server';
import { and, eq, isNull, or } from 'drizzle-orm';
import { normaliseEmail, normalisePhone } from '@/domain/contacts/normalise';
import { displayName } from '@/domain/contacts/display-name';
import { getActiveSession } from '@/server/auth/require-session';
import { contact } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';
import { withTenant } from '@/server/db/with-tenant';

async function matchByEmail(tx: DbTransaction, orgId: string, email: string) {
  const [row] = await tx
    .select({
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phoneE164: contact.phoneE164,
    })
    .from(contact)
    .where(
      and(
        eq(contact.orgId, orgId),
        or(eq(contact.emailNormalised, email), eq(contact.secondaryEmailNormalised, email)),
        isNull(contact.deletedAt),
        isNull(contact.mergedIntoId),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function matchByPhone(tx: DbTransaction, orgId: string, phone: string) {
  const [row] = await tx
    .select({
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phoneE164: contact.phoneE164,
    })
    .from(contact)
    .where(
      and(
        eq(contact.orgId, orgId),
        or(eq(contact.phoneE164, phone), eq(contact.secondaryPhoneE164, phone)),
        isNull(contact.deletedAt),
        isNull(contact.mergedIntoId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function GET(request: NextRequest) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const emailRaw = request.nextUrl.searchParams.get('email') ?? '';
  const phoneRaw = request.nextUrl.searchParams.get('phone') ?? '';
  const email = normaliseEmail(emailRaw.trim() || null);
  const phone = normalisePhone(phoneRaw.trim() || null);

  if (!email && !phone) {
    return NextResponse.json({ emailMatch: null, phoneMatch: null });
  }

  const result = await withTenant(session, async (tx) => {
    const emailMatch = email ? await matchByEmail(tx, session.orgId, email) : null;
    const phoneMatch = phone ? await matchByPhone(tx, session.orgId, phone) : null;
    return { emailMatch, phoneMatch };
  });

  return NextResponse.json({
    emailMatch: result.emailMatch
      ? { id: result.emailMatch.id, displayName: displayName(result.emailMatch) }
      : null,
    phoneMatch: result.phoneMatch
      ? { id: result.phoneMatch.id, displayName: displayName(result.phoneMatch) }
      : null,
  });
}
