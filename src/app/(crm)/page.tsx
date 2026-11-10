import type { Metadata } from 'next';
import { DashboardPageClient } from '@/features/dashboard/dashboard-page-client';
import { requireSession } from '@/server/auth/require-session';

export const metadata: Metadata = { title: 'Dashboard' };

/** Data loads via `/api/v1/dashboard/bootstrap` after paint (layout already verified session). */
export default async function DashboardPage() {
  const session = await requireSession();

  return (
    <DashboardPageClient fullName={session.fullName} role={session.role} />
  );
}
