import type { Metadata } from 'next';
import { CompaniesPageClient } from '@/features/companies/companies-page-client';
import { requireSession } from '@/server/auth/require-session';

export const metadata: Metadata = { title: 'Companies' };

export default async function CompaniesPage() {
  const session = await requireSession();
  return <CompaniesPageClient role={session.role} userId={session.userId} />;
}
