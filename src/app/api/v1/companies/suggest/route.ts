import { NextResponse, type NextRequest } from 'next/server';
import { companyNameFromDomain, emailDomainForCompanyMatch } from '@/domain/companies/suggest-from-email';
import { getActiveSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { and, eq, isNull } from 'drizzle-orm';
import { company } from '@/server/db/schema';
import { findCompanyIdByEmailDomain } from '@/server/services/companies/contact-company-link';

export async function GET(request: NextRequest) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const email = request.nextUrl.searchParams.get('email') ?? '';
  const domain = emailDomainForCompanyMatch(email);
  if (!domain) {
    return NextResponse.json({ company: null, suggestCreate: null });
  }

  const match = await withTenant(session, async (tx) => {
    const companyId = await findCompanyIdByEmailDomain(tx, session.orgId, email);
    if (!companyId) return null;
    const [row] = await tx
      .select({ id: company.id, name: company.name, domain: company.domainNormalised })
      .from(company)
      .where(
        and(eq(company.orgId, session.orgId), eq(company.id, companyId), isNull(company.deletedAt)),
      )
      .limit(1);
    return row ?? null;
  });

  if (match) {
    return NextResponse.json({
      company: { id: match.id, name: match.name, domain: match.domain },
      suggestCreate: null,
    });
  }

  return NextResponse.json({
    company: null,
    suggestCreate: { name: companyNameFromDomain(domain), domain },
  });
}
