import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CompanyDetailClient } from '@/features/companies/company-detail-client';
import { NotFoundError } from '@/server/access/capabilities';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { getCompanyDetail } from '@/server/services/companies/get-company-detail';

type PageProps = { params: Promise<{ companyId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const session = await requireSession();
    const { companyId } = await params;
    const company = await withTenant(session, (tx) =>
      getCompanyDetail(tx, session, companyId),
    );
    return { title: company.name };
  } catch {
    return { title: 'Company' };
  }
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const session = await requireSession();
  const { companyId } = await params;

  try {
    const company = await withTenant(session, (tx) =>
      getCompanyDetail(tx, session, companyId),
    );
    return (
      <CompanyDetailClient
        companyId={companyId}
        initial={company}
        role={session.role}
        userId={session.userId}
      />
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }
}
