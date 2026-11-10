import 'server-only';

import type { CrmRole } from '@/server/db/schema';

export type CrmSession = {
  sessionId: string;
  orgId: string;
  userId: string;
  role: CrmRole;
  email: string;
  fullName: string;
  organisationName: string;
  expiresAt: Date;
  orgOnboardingCompletedAt: Date | null;
  profileCompletedAt: Date | null;
};
