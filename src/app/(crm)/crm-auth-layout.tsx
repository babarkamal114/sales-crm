import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { CrmAppShell } from '@/components/layouts/crm-app-shell';
import {
  getActiveSession,
  getSignedInUserWithoutMembership,
} from '@/server/auth/require-session';
import { sessionNeedsOnboardingGate } from '@/server/auth/session-gate';
import { guardCrmRouteForSession } from '@/server/onboarding/resolve-crm-entry';

export async function CrmAuthLayout({ children }: { children: ReactNode }) {
  const session = await getActiveSession();

  if (!session) {
    const unsigned = await getSignedInUserWithoutMembership();
    if (unsigned) {
      redirect('/no-access');
    }
    redirect('/sign-in');
  }

  const headerStore = await headers();
  const pathname = headerStore.get('x-pathname') ?? '/';

  if (sessionNeedsOnboardingGate(session)) {
    const gateRedirect = await guardCrmRouteForSession(session, pathname);
    if (gateRedirect) {
      redirect(gateRedirect);
    }
  }

  return (
    <CrmAppShell
      fullName={session.fullName}
      email={session.email}
      organisationName={session.organisationName}
      role={session.role}
      userId={session.userId}
    >
      {children}
    </CrmAppShell>
  );
}
