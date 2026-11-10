import 'server-only';

import type { DbTransaction } from '@/server/db/with-tenant';
import {
  onboardingProgress,
  organisationSettings,
} from '@/server/db/schema';
import { ONBOARDING_STEP } from '@/domain/onboarding/steps';

export async function bootstrapOrgOnboarding(
  tx: DbTransaction,
  input: {
    orgId: string;
    userId: string;
    displayName: string;
  },
): Promise<void> {
  await tx.insert(organisationSettings).values({
    orgId: input.orgId,
    displayName: input.displayName,
    createdBy: input.userId,
    updatedBy: input.userId,
    onboardingCompletedAt: null,
    onboardingCompletedBy: null,
  });

  await tx.insert(onboardingProgress).values({
    orgId: input.orgId,
    currentStep: ONBOARDING_STEP.profile,
    completedSteps: [],
    skippedSteps: [],
    stepDrafts: {},
    setupStartedByUserId: input.userId,
    updatedBy: input.userId,
  });
}
