import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_STEP,
  onboardingStepPath,
} from '@/domain/onboarding/steps';
import type { EntryContext } from '@/domain/onboarding/entry-types';
import {
  canAccessOnboardingStep,
  ENTRY_ROUTES,
  isOnboardingAllowlistedPath,
  redirectForIncompleteOnboarding,
  resolveEntry,
} from '@/domain/onboarding/resolve-entry';

function baseContext(
  overrides: Partial<EntryContext> = {},
): EntryContext {
  return {
    userId: 'user-1',
    fullName: 'Alex Admin',
    email: 'alex@example.com',
    activeOrgId: 'org-1',
    memberships: [{ orgId: 'org-1', role: 'admin' }],
    organisations: [
      {
        orgId: 'org-1',
        orgName: 'Acme Care',
        onboardingCompletedAt: null,
        currentStep: null,
        completedSteps: [],
        skippedSteps: [],
        setupStartedByUserId: 'user-1',
        setupStartedByName: 'Alex Admin',
        sponsoroOrganisationName: null,
        hasAnyCrmMember: true,
      },
    ],
    pendingInvitation: null,
    accessRequest: null,
    memberProfileCompleted: false,
    memberTourComplete: false,
    hasExternalOrganisationIdentity: false,
    ...overrides,
  };
}

describe('resolveEntry — situation table (Phase 2)', () => {
  const cases: Array<{
    id: string;
    situation: string;
    setup: Partial<EntryContext> | ((ctx: EntryContext) => EntryContext);
    expectedPath: string;
    expectedSituation: string;
    gate: boolean;
  }> = [
    {
      id: 'A',
      situation: 'New account, no organisation',
      setup: {
        memberships: [],
        organisations: [],
        activeOrgId: null,
      },
      expectedPath: onboardingStepPath(ONBOARDING_STEP.profile),
      expectedSituation: 'A_new_account_no_org',
      gate: true,
    },
    {
      id: 'B',
      situation: 'Invited member, org onboarding complete',
      setup: {
        memberships: [{ orgId: 'org-1', role: 'member' }],
        pendingInvitation: {
          orgId: 'org-1',
          role: 'member',
          orgOnboardingComplete: true,
          status: 'pending',
        },
        organisations: [
          {
            orgId: 'org-1',
            orgName: 'Acme',
            onboardingCompletedAt: new Date('2026-01-01'),
            currentStep: null,
            completedSteps: [],
            skippedSteps: [],
            setupStartedByUserId: null,
            setupStartedByName: null,
            sponsoroOrganisationName: null,
            hasAnyCrmMember: true,
          },
        ],
      },
      expectedPath: onboardingStepPath(ONBOARDING_STEP.profile),
      expectedSituation: 'B_invited_member',
      gate: true,
    },
    {
      id: 'C',
      situation: 'Sponsoro org exists, CRM not set up, first admin',
      setup: {
        hasExternalOrganisationIdentity: true,
        memberships: [],
        activeOrgId: null,
        organisations: [
          {
            orgId: 'org-1',
            orgName: 'Acme',
            onboardingCompletedAt: null,
            currentStep: null,
            completedSteps: [],
            skippedSteps: [],
            setupStartedByUserId: 'user-1',
            setupStartedByName: 'Alex Admin',
            sponsoroOrganisationName: 'Acme Care Ltd',
            hasAnyCrmMember: false,
          },
        ],
      },
      expectedPath: onboardingStepPath(ONBOARDING_STEP.profile),
      expectedSituation: 'C_sponsoro_org_crm_setup',
      gate: true,
    },
    {
      id: 'D',
      situation: 'Org uses CRM, user has no membership',
      setup: {
        memberships: [],
        activeOrgId: null,
        hasExternalOrganisationIdentity: true,
        organisations: [
          {
            orgId: 'org-1',
            orgName: 'Acme',
            onboardingCompletedAt: new Date('2026-01-01'),
            currentStep: null,
            completedSteps: [],
            skippedSteps: [],
            setupStartedByUserId: null,
            setupStartedByName: null,
            sponsoroOrganisationName: null,
            hasAnyCrmMember: true,
          },
        ],
      },
      expectedPath: ENTRY_ROUTES.requestAccess,
      expectedSituation: 'D_request_access',
      gate: true,
    },
    {
      id: 'E',
      situation: 'Admin resumed mid-onboarding',
      setup: {
        organisations: [
          {
            orgId: 'org-1',
            orgName: 'Acme',
            onboardingCompletedAt: null,
            currentStep: ONBOARDING_STEP.pipeline,
            completedSteps: [
              ONBOARDING_STEP.profile,
              ONBOARDING_STEP.organisation,
              ONBOARDING_STEP.agreements,
            ],
            skippedSteps: [],
            setupStartedByUserId: 'user-1',
            setupStartedByName: 'Alex Admin',
            sponsoroOrganisationName: null,
            hasAnyCrmMember: true,
          },
        ],
      },
      expectedPath: onboardingStepPath(ONBOARDING_STEP.pipeline),
      expectedSituation: 'E_resume_admin',
      gate: true,
    },
    {
      id: 'F',
      situation: 'Onboarding complete, CRM member',
      setup: {
        organisations: [
          {
            orgId: 'org-1',
            orgName: 'Acme',
            onboardingCompletedAt: new Date('2026-01-01'),
            currentStep: null,
            completedSteps: [],
            skippedSteps: [],
            setupStartedByUserId: null,
            setupStartedByName: null,
            sponsoroOrganisationName: null,
            hasAnyCrmMember: true,
          },
        ],
        memberProfileCompleted: true,
        memberTourComplete: true,
      },
      expectedPath: ENTRY_ROUTES.dashboard,
      expectedSituation: 'F_dashboard',
      gate: false,
    },
    {
      id: 'G',
      situation: 'Multiple organisations, none selected',
      setup: {
        activeOrgId: null,
        memberships: [
          { orgId: 'org-1', role: 'admin' },
          { orgId: 'org-2', role: 'member' },
        ],
        organisations: [
          {
            orgId: 'org-1',
            orgName: 'A',
            onboardingCompletedAt: new Date('2026-01-01'),
            currentStep: null,
            completedSteps: [],
            skippedSteps: [],
            setupStartedByUserId: null,
            setupStartedByName: null,
            sponsoroOrganisationName: null,
            hasAnyCrmMember: true,
          },
          {
            orgId: 'org-2',
            orgName: 'B',
            onboardingCompletedAt: new Date('2026-01-01'),
            currentStep: null,
            completedSteps: [],
            skippedSteps: [],
            setupStartedByUserId: null,
            setupStartedByName: null,
            sponsoroOrganisationName: null,
            hasAnyCrmMember: true,
          },
        ],
      },
      expectedPath: ENTRY_ROUTES.selectOrganisation,
      expectedSituation: 'G_choose_organisation',
      gate: true,
    },
    {
      id: 'O6',
      situation: 'Colleague mid-onboarding (second user)',
      setup: {
        userId: 'user-2',
        memberships: [],
        hasExternalOrganisationIdentity: true,
        organisations: [
          {
            orgId: 'org-1',
            orgName: 'Acme',
            onboardingCompletedAt: null,
            currentStep: ONBOARDING_STEP.organisation,
            completedSteps: [ONBOARDING_STEP.profile],
            skippedSteps: [],
            setupStartedByUserId: 'user-1',
            setupStartedByName: 'Alex Admin',
            sponsoroOrganisationName: null,
            hasAnyCrmMember: false,
          },
        ],
      },
      expectedPath: ENTRY_ROUTES.blockedColleague,
      expectedSituation: 'blocked_colleague_onboarding',
      gate: true,
    },
    {
      id: 'O9',
      situation: 'Invitation expired',
      setup: {
        pendingInvitation: {
          orgId: 'org-1',
          role: 'member',
          orgOnboardingComplete: true,
          status: 'expired',
        },
      },
      expectedPath: ENTRY_ROUTES.invitationInvalid,
      expectedSituation: 'invitation_invalid',
      gate: true,
    },
  ];

  it.each(cases)('$id — $situation', ({ setup, expectedPath, expectedSituation, gate }) => {
    const ctx =
      typeof setup === 'function'
        ? setup(baseContext())
        : baseContext(setup);
    const result = resolveEntry(ctx);
    expect(result.redirectTo).toBe(expectedPath);
    expect(result.situation).toBe(expectedSituation);
    expect(result.enforceOnboardingGate).toBe(gate);
  });
});

describe('onboarding gate', () => {
  it('O4 — blocks /opportunities until onboarding finished', () => {
    const entry = resolveEntry(baseContext());
    const redirect = redirectForIncompleteOnboarding(entry, '/opportunities');
    expect(redirect).toBe(onboardingStepPath(ONBOARDING_STEP.profile));
  });

  it('allows /onboarding/* while gated', () => {
    const entry = resolveEntry(baseContext());
    expect(
      redirectForIncompleteOnboarding(entry, '/onboarding/pipeline'),
    ).toBeNull();
    expect(isOnboardingAllowlistedPath('/sign-out')).toBe(true);
  });
});

describe('canAccessOnboardingStep — O12', () => {
  it('member cannot open admin organisation step', () => {
    expect(
      canAccessOnboardingStep({
        role: 'member',
        step: ONBOARDING_STEP.organisation,
        onboardingPath: 'A',
      }),
    ).toBe(false);
  });

  it('member on path B can open profile and tour only', () => {
    expect(
      canAccessOnboardingStep({
        role: 'member',
        step: ONBOARDING_STEP.profile,
        onboardingPath: 'B',
      }),
    ).toBe(true);
    expect(
      canAccessOnboardingStep({
        role: 'member',
        step: ONBOARDING_STEP.agreements,
        onboardingPath: 'B',
      }),
    ).toBe(false);
  });
});
