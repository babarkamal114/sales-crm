import 'server-only';

import { eq } from 'drizzle-orm';
import type { CrmSession } from '@/server/auth/session-types';
import { canAccessOnboardingStep, resolveEntry } from '@/domain/onboarding/resolve-entry';
import {
  firstUnfinishedPathAStep,
  ONBOARDING_STEP,
  PATH_A_ADMIN_STEPS,
  type OnboardingStepSlug,
} from '@/domain/onboarding/steps';
import { organisationSettings } from '@/server/db/schema';
import { withTenant } from '@/server/db/with-tenant';
import { getEntryContext } from '@/server/onboarding/get-entry-context';

export type OnboardingPageModel = {
  organisationName: string;
  path: 'A' | 'B';
  role: CrmSession['role'];
  currentStep: OnboardingStepSlug;
  completedSteps: OnboardingStepSlug[];
  skippedSteps: OnboardingStepSlug[];
  stepIndex: number;
  stepTotal: number;
  settings: {
    displayName: string;
    industry: string;
    teamSizeBand: string;
    country: string;
    currency: string;
    timeZone: string;
    postalAddress: string;
    leadSources: string[];
    contactChannels: string[];
  };
};

export async function loadOnboardingPageModel(
  session: CrmSession,
  step: OnboardingStepSlug,
): Promise<
  | { ok: true; model: OnboardingPageModel }
  | { ok: false; redirectTo: string }
> {
  const context = await getEntryContext(session);
  const entry = resolveEntry(context);

  if (!entry.enforceOnboardingGate && step !== ONBOARDING_STEP.complete) {
    return { ok: false, redirectTo: '/' };
  }

  const path = entry.onboardingPath ?? 'A';
  const canAccess = canAccessOnboardingStep({
    role: session.role,
    step,
    onboardingPath: path,
  });
  if (!canAccess) {
    return {
      ok: false,
      redirectTo: entry.redirectTo ?? '/onboarding/profile',
    };
  }

  const orgSnapshot = context.organisations.find((o) => o.orgId === session.orgId);
  const completedSteps = (orgSnapshot?.completedSteps ?? []) as OnboardingStepSlug[];
  const skippedSteps = (orgSnapshot?.skippedSteps ?? []) as OnboardingStepSlug[];
  const currentStep =
    orgSnapshot?.currentStep ??
    firstUnfinishedPathAStep({ completedSteps, skippedSteps });

  const settings = await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) => {
      const [row] = await tx
        .select()
        .from(organisationSettings)
        .where(eq(organisationSettings.orgId, session.orgId))
        .limit(1);
      return row;
    },
  );

  const adminSteps = PATH_A_ADMIN_STEPS.filter(
    (s): s is Exclude<OnboardingStepSlug, 'complete'> => s !== ONBOARDING_STEP.complete,
  );
  const stepIndex =
    path === 'A' && step !== ONBOARDING_STEP.complete
      ? Math.max(1, adminSteps.indexOf(step) + 1)
      : step === ONBOARDING_STEP.profile
        ? 1
        : 2;
  const stepTotal = path === 'A' ? adminSteps.length : 2;

  return {
    ok: true,
    model: {
      organisationName: session.organisationName,
      path,
      role: session.role,
      currentStep,
      completedSteps,
      skippedSteps,
      stepIndex,
      stepTotal,
      settings: {
        displayName: settings?.displayName ?? session.organisationName,
        industry: settings?.industry ?? '',
        teamSizeBand: settings?.teamSizeBand ?? '',
        country: settings?.country ?? 'GB',
        currency: settings?.currency ?? 'GBP',
        timeZone: settings?.timeZone ?? 'Europe/London',
        postalAddress: settings?.postalAddress ?? '',
        leadSources: settings?.leadSources ?? [],
        contactChannels: settings?.contactChannels ?? [],
      },
    },
  };
}
