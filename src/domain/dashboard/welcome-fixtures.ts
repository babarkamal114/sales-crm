import type { WelcomeOrgSnapshot } from '@/domain/dashboard/welcome-snapshot';

/** Baseline org state for dev `?scenario=` welcome previews. */
export const welcomePreviewSnapshot = (): WelcomeOrgSnapshot => ({
  onboardingCompletedAt: new Date(),
  onboardingCurrentStep: null,
  hasDefaultPipeline: false,
  contactCount: 0,
  emailConnected: false,
  callingConnected: false,
  stripeConnected: false,
  activeMemberCount: 1,
  pendingInviteCount: 0,
  profileCompletedAt: null,
  tourCompletedAt: null,
});
