import 'server-only';

import type { CrmSession } from '@/server/auth/session-types';

/** When false, skip heavy `loadEntryContext` on every CRM navigation. */
export function sessionNeedsOnboardingGate(session: CrmSession): boolean {
  if (!session.orgOnboardingCompletedAt) {
    return true;
  }
  if (session.role !== 'admin' && !session.profileCompletedAt) {
    return true;
  }
  return false;
}
