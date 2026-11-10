import 'server-only';

import type { DashboardWelcomeResponse } from '@/domain/dashboard/types';
import type { CrmSession } from '@/server/auth/session-types';

const RECENT_ONBOARDING_MS = 30 * 86_400_000;

/** Skip Neon for established orgs — welcome banner only applies shortly after setup. */
export function welcomeWithoutDb(session: CrmSession): DashboardWelcomeResponse | null {
  const completedAt = session.orgOnboardingCompletedAt;
  if (!completedAt) {
    return null;
  }
  const ageMs = Date.now() - completedAt.getTime();
  if (ageMs >= RECENT_ONBOARDING_MS) {
    return { showWelcome: false, mode: 'hidden', title: '', subtitle: '', checklist: [] };
  }
  return null;
}
