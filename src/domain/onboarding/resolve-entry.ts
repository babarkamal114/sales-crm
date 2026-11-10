import {
  firstUnfinishedPathAStep,
  firstUnfinishedPathBStep,
  isAdminOnlyStep,
  onboardingStepPath,
  ONBOARDING_STEP,
  type OnboardingStepSlug,
} from '@/domain/onboarding/steps';
import type {
  EntryContext,
  EntryResolution,
  EntrySituation,
  OrganisationOnboardingSnapshot,
} from '@/domain/onboarding/entry-types';

export const ENTRY_ROUTES = {
  dashboard: '/',
  requestAccess: '/onboarding/request-access',
  selectOrganisation: '/onboarding/select-organisation',
  invitationInvalid: '/onboarding/invitation-invalid',
  blockedColleague: '/onboarding/setup-in-progress',
} as const;

export const ONBOARDING_ALLOWLIST_PREFIXES = [
  '/onboarding',
  '/sign-in',
  '/sign-up',
  '/api/auth',
] as const;

export function isOnboardingAllowlistedPath(pathname: string): boolean {
  if (pathname === '/sign-out') {
    return true;
  }
  return ONBOARDING_ALLOWLIST_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function pickActiveOrg(context: EntryContext): OrganisationOnboardingSnapshot | null {
  const { activeOrgId, organisations, memberships } = context;
  if (activeOrgId) {
    return organisations.find((org) => org.orgId === activeOrgId) ?? null;
  }
  const soleMembership = memberships.length === 1 ? memberships[0] : undefined;
  if (soleMembership) {
    return organisations.find((org) => org.orgId === soleMembership.orgId) ?? null;
  }
  return null;
}

function membershipForOrg(
  context: EntryContext,
  orgId: string,
): EntryContext['memberships'][number] | null {
  return context.memberships.find((row) => row.orgId === orgId) ?? null;
}

function resolution(
  situation: EntrySituation,
  redirectTo: string,
  enforceOnboardingGate: boolean,
  onboardingPath: 'A' | 'B' | null,
): EntryResolution {
  return { situation, redirectTo, enforceOnboardingGate, onboardingPath };
}

export function resolveEntry(context: EntryContext): EntryResolution {
  if (
    context.pendingInvitation?.status === 'expired' ||
    context.pendingInvitation?.status === 'revoked'
  ) {
    return resolution(
      'invitation_invalid',
      ENTRY_ROUTES.invitationInvalid,
      true,
      null,
    );
  }

  if (context.memberships.length > 1 && !context.activeOrgId) {
    return resolution(
      'G_choose_organisation',
      ENTRY_ROUTES.selectOrganisation,
      true,
      null,
    );
  }

  const activeOrg = pickActiveOrg(context);
  const activeMembership =
    activeOrg === null ? null : membershipForOrg(context, activeOrg.orgId);

  if (context.pendingInvitation?.status === 'pending') {
    const inviteOrg = context.organisations.find(
      (org) => org.orgId === context.pendingInvitation?.orgId,
    );
    if (inviteOrg?.onboardingCompletedAt) {
      const next = firstUnfinishedPathBStep({
        profileCompleted: context.memberProfileCompleted,
        tourSkippedOrCompleted: context.memberTourComplete,
      });
      if (next === null) {
        return resolution('F_dashboard', ENTRY_ROUTES.dashboard, false, null);
      }
      return resolution(
        'B_invited_member',
        onboardingStepPath(next),
        true,
        'B',
      );
    }
  }

  if (activeMembership && activeOrg) {
    if (activeOrg.onboardingCompletedAt) {
      const memberNext = firstUnfinishedPathBStep({
        profileCompleted: context.memberProfileCompleted,
        tourSkippedOrCompleted: context.memberTourComplete,
      });
      if (activeMembership.role === 'member' && memberNext !== null) {
        return resolution(
          'B_invited_member',
          onboardingStepPath(memberNext),
          true,
          'B',
        );
      }
      return resolution('F_dashboard', ENTRY_ROUTES.dashboard, false, null);
    }

    if (
      activeOrg.setupStartedByUserId &&
      activeOrg.setupStartedByUserId !== context.userId &&
      !activeOrg.hasAnyCrmMember
    ) {
      return resolution(
        'blocked_colleague_onboarding',
        ENTRY_ROUTES.blockedColleague,
        true,
        null,
      );
    }

    if (activeMembership.role !== 'admin') {
      if (activeOrg.hasAnyCrmMember) {
        return resolution(
          'D_request_access',
          ENTRY_ROUTES.requestAccess,
          true,
          null,
        );
      }
      return resolution(
        'blocked_colleague_onboarding',
        ENTRY_ROUTES.blockedColleague,
        true,
        null,
      );
    }

    const step =
      activeOrg.currentStep ??
      firstUnfinishedPathAStep({
        completedSteps: activeOrg.completedSteps,
        skippedSteps: activeOrg.skippedSteps,
      });

    return resolution(
      activeOrg.currentStep ? 'E_resume_admin' : 'C_sponsoro_org_crm_setup',
      onboardingStepPath(step),
      true,
      'A',
    );
  }

  if (
    context.memberships.length === 0 &&
    context.hasExternalOrganisationIdentity
  ) {
    const targetOrg = context.organisations[0];
    if (targetOrg?.hasAnyCrmMember && targetOrg.onboardingCompletedAt) {
      return resolution(
        'D_request_access',
        ENTRY_ROUTES.requestAccess,
        true,
        null,
      );
    }
    if (targetOrg && !targetOrg.onboardingCompletedAt) {
      if (
        targetOrg.setupStartedByUserId &&
        targetOrg.setupStartedByUserId !== context.userId
      ) {
        return resolution(
          'blocked_colleague_onboarding',
          ENTRY_ROUTES.blockedColleague,
          true,
          null,
        );
      }
      return resolution(
        'C_sponsoro_org_crm_setup',
        onboardingStepPath(ONBOARDING_STEP.profile),
        true,
        'A',
      );
    }
  }

  if (context.memberships.length === 0) {
    return resolution(
      'A_new_account_no_org',
      onboardingStepPath(ONBOARDING_STEP.profile),
      true,
      'A',
    );
  }

  return resolution('F_dashboard', ENTRY_ROUTES.dashboard, false, null);
}

export function canAccessOnboardingStep(input: {
  role: EntryContext['memberships'][number]['role'] | null;
  step: OnboardingStepSlug;
  onboardingPath: 'A' | 'B' | null;
}): boolean {
  if (input.onboardingPath === 'B') {
    return (
      input.step === ONBOARDING_STEP.profile ||
      input.step === ONBOARDING_STEP.tour
    );
  }
  if (input.role === 'member' || input.role === 'manager') {
    if (input.onboardingPath === 'A') {
      return input.step === ONBOARDING_STEP.profile;
    }
    return !isAdminOnlyStep(input.step);
  }
  if (input.role === 'admin') {
    return true;
  }
  return false;
}

export function redirectForIncompleteOnboarding(
  entry: EntryResolution,
  pathname: string,
): string | null {
  if (!entry.enforceOnboardingGate) {
    return null;
  }
  if (isOnboardingAllowlistedPath(pathname)) {
    return null;
  }
  return entry.redirectTo;
}
