/** URL segments under `/onboarding/[step]`. */
export const ONBOARDING_STEP = {
  profile: 'profile',
  organisation: 'organisation',
  agreements: 'agreements',
  pipeline: 'pipeline',
  leads: 'leads',
  team: 'team',
  tools: 'tools',
  complete: 'complete',
  tour: 'tour',
} as const;

export type OnboardingStepSlug =
  (typeof ONBOARDING_STEP)[keyof typeof ONBOARDING_STEP];

/** Path A — Admin setup (required steps must be completed in order). */
export const PATH_A_ADMIN_STEPS: readonly OnboardingStepSlug[] = [
  ONBOARDING_STEP.profile,
  ONBOARDING_STEP.organisation,
  ONBOARDING_STEP.agreements,
  ONBOARDING_STEP.pipeline,
  ONBOARDING_STEP.leads,
  ONBOARDING_STEP.team,
  ONBOARDING_STEP.tools,
  ONBOARDING_STEP.complete,
] as const;

export const PATH_A_REQUIRED_STEPS: readonly OnboardingStepSlug[] = [
  ONBOARDING_STEP.profile,
  ONBOARDING_STEP.organisation,
  ONBOARDING_STEP.agreements,
  ONBOARDING_STEP.pipeline,
] as const;

export const PATH_A_OPTIONAL_STEPS: readonly OnboardingStepSlug[] = [
  ONBOARDING_STEP.leads,
  ONBOARDING_STEP.team,
  ONBOARDING_STEP.tools,
] as const;

/** Path B — invited member. */
export const PATH_B_MEMBER_STEPS: readonly OnboardingStepSlug[] = [
  ONBOARDING_STEP.profile,
  ONBOARDING_STEP.tour,
] as const;

export const ADMIN_ONLY_STEPS: readonly OnboardingStepSlug[] = [
  ONBOARDING_STEP.organisation,
  ONBOARDING_STEP.agreements,
  ONBOARDING_STEP.pipeline,
  ONBOARDING_STEP.leads,
  ONBOARDING_STEP.team,
  ONBOARDING_STEP.tools,
  ONBOARDING_STEP.complete,
] as const;

export function onboardingStepPath(step: OnboardingStepSlug): string {
  return `/onboarding/${step}`;
}

/** Previous wizard step for back navigation (linear order). */
export function previousOnboardingStep(input: {
  current: OnboardingStepSlug;
  path: 'A' | 'B';
}): OnboardingStepSlug | null {
  if (input.path === 'B') {
    const idx = PATH_B_MEMBER_STEPS.indexOf(input.current);
    if (idx <= 0) {
      return null;
    }
    return PATH_B_MEMBER_STEPS[idx - 1] ?? null;
  }

  if (input.current === ONBOARDING_STEP.complete) {
    return ONBOARDING_STEP.tools;
  }

  const linear = PATH_A_ADMIN_STEPS.filter((s) => s !== ONBOARDING_STEP.complete);
  const idx = linear.indexOf(input.current);
  if (idx <= 0) {
    return null;
  }
  return linear[idx - 1] ?? null;
}

export function isAdminOnlyStep(step: OnboardingStepSlug): boolean {
  return (ADMIN_ONLY_STEPS as readonly string[]).includes(step);
}

export function isOptionalPathAStep(step: OnboardingStepSlug): boolean {
  return (PATH_A_OPTIONAL_STEPS as readonly string[]).includes(step);
}

export function firstUnfinishedPathAStep(input: {
  completedSteps: readonly OnboardingStepSlug[];
  skippedSteps: readonly OnboardingStepSlug[];
}): OnboardingStepSlug {
  for (const step of PATH_A_ADMIN_STEPS) {
    if (step === ONBOARDING_STEP.complete) {
      continue;
    }
    const done =
      input.completedSteps.includes(step) ||
      (isOptionalPathAStep(step) && input.skippedSteps.includes(step));
    if (!done) {
      return step;
    }
  }
  return ONBOARDING_STEP.complete;
}

export function firstUnfinishedPathBStep(input: {
  profileCompleted: boolean;
  tourSkippedOrCompleted: boolean;
}): OnboardingStepSlug | null {
  if (!input.profileCompleted) {
    return ONBOARDING_STEP.profile;
  }
  if (!input.tourSkippedOrCompleted) {
    return ONBOARDING_STEP.tour;
  }
  return null;
}
