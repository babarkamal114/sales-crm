import type { OnboardingStepSlug } from '@/domain/onboarding/steps';

/** Raw org state used to compute welcome UI (from DB or fixtures). */
export type WelcomeOrgSnapshot = {
  onboardingCompletedAt: Date | null;
  onboardingCurrentStep: OnboardingStepSlug | null;
  hasDefaultPipeline: boolean;
  contactCount: number;
  emailConnected: boolean;
  callingConnected: boolean;
  stripeConnected: boolean;
  activeMemberCount: number;
  pendingInviteCount: number;
  profileCompletedAt: Date | null;
  tourCompletedAt: Date | null;
};
