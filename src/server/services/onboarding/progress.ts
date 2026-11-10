import 'server-only';

import { eq } from 'drizzle-orm';
import {
  ONBOARDING_STEP,
  firstUnfinishedPathAStep,
  type OnboardingStepSlug,
} from '@/domain/onboarding/steps';
import { onboardingProgress } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export function nextOnboardingPath(nextStep: OnboardingStepSlug): string {
  if (nextStep === ONBOARDING_STEP.complete) {
    return '/onboarding/complete';
  }
  return `/onboarding/${nextStep}`;
}

export async function markOnboardingStepComplete(
  tx: DbTransaction,
  session: TenantSession,
  step: OnboardingStepSlug,
): Promise<string> {
  const [progress] = await tx
    .select()
    .from(onboardingProgress)
    .where(eq(onboardingProgress.orgId, session.orgId))
    .limit(1);

  const completed = new Set(
    (progress?.completedSteps ?? []) as OnboardingStepSlug[],
  );
  completed.add(step);

  const skipped = (progress?.skippedSteps ?? []) as OnboardingStepSlug[];
  const nextStep = firstUnfinishedPathAStep({
    completedSteps: [...completed],
    skippedSteps: skipped,
  });

  await tx
    .update(onboardingProgress)
    .set({
      completedSteps: [...completed],
      currentStep: nextStep,
      updatedAt: new Date(),
      updatedBy: session.userId,
    })
    .where(eq(onboardingProgress.orgId, session.orgId));

  return nextOnboardingPath(nextStep);
}

export async function markOnboardingStepSkipped(
  tx: DbTransaction,
  session: TenantSession,
  step: OnboardingStepSlug,
): Promise<string> {
  const [progress] = await tx
    .select()
    .from(onboardingProgress)
    .where(eq(onboardingProgress.orgId, session.orgId))
    .limit(1);

  const skipped = new Set(
    (progress?.skippedSteps ?? []) as OnboardingStepSlug[],
  );
  skipped.add(step);

  const completed = (progress?.completedSteps ?? []) as OnboardingStepSlug[];
  const nextStep = firstUnfinishedPathAStep({
    completedSteps: completed,
    skippedSteps: [...skipped],
  });

  await tx
    .update(onboardingProgress)
    .set({
      skippedSteps: [...skipped],
      currentStep: nextStep,
      updatedAt: new Date(),
      updatedBy: session.userId,
    })
    .where(eq(onboardingProgress.orgId, session.orgId));

  return nextOnboardingPath(nextStep);
}
