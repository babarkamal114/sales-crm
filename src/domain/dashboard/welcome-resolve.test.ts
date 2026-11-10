import { describe, expect, it } from 'vitest';
import { welcomePreviewSnapshot } from '@/domain/dashboard/welcome-fixtures';
import { resolveWelcomeResponse } from '@/domain/dashboard/welcome-resolve';
import type { WelcomeOrgSnapshot } from '@/domain/dashboard/welcome-snapshot';
import { ONBOARDING_STEP } from '@/domain/onboarding/steps';

function snapshot(overrides: Partial<WelcomeOrgSnapshot>): WelcomeOrgSnapshot {
  return { ...welcomePreviewSnapshot(), ...overrides };
}

describe('resolveWelcomeResponse', () => {
  it('shows preview checklist for new-org scenario', () => {
    const result = resolveWelcomeResponse({
      scenario: 'new-org',
      role: 'admin',
      snapshot: welcomePreviewSnapshot(),
    });
    expect(result.showWelcome).toBe(true);
    expect(result.mode).toBe('preview');
    expect(result.progress).toEqual({ completed: 0, total: 6 });
    expect(result.checklist[0]?.inlineSetup).toBe(true);
  });

  it('hides welcome for populated scenario', () => {
    const result = resolveWelcomeResponse({
      scenario: 'populated',
      role: 'admin',
      snapshot: welcomePreviewSnapshot(),
    });
    expect(result.showWelcome).toBe(false);
  });

  it('continues onboarding when org setup incomplete', () => {
    const result = resolveWelcomeResponse({
      role: 'admin',
      snapshot: snapshot({
        onboardingCompletedAt: null,
        onboardingCurrentStep: ONBOARDING_STEP.leads,
      }),
    });
    expect(result.showWelcome).toBe(true);
    expect(result.mode).toBe('continue_onboarding');
    expect(result.checklist).toHaveLength(6);
    expect(result.checklist.every((c) => c.inlineSetup || c.done)).toBe(true);
  });

  it('marks team done when more than one active member', () => {
    const result = resolveWelcomeResponse({
      role: 'admin',
      snapshot: snapshot({
        hasDefaultPipeline: false,
        contactCount: 0,
        activeMemberCount: 3,
        pendingInviteCount: 0,
      }),
    });
    expect(result.showWelcome).toBe(true);
    const team = result.checklist.find((c) => c.id === 'team');
    expect(team?.done).toBe(true);
  });

  it('hides org welcome when all steps done within window', () => {
    const result = resolveWelcomeResponse({
      role: 'admin',
      snapshot: snapshot({
        hasDefaultPipeline: true,
        contactCount: 5,
        emailConnected: true,
        callingConnected: true,
        stripeConnected: true,
        activeMemberCount: 2,
      }),
    });
    expect(result.showWelcome).toBe(false);
  });

  it('hides org welcome when onboarding completed over 30 days ago', () => {
    const old = new Date(Date.now() - 31 * 86_400_000);
    const result = resolveWelcomeResponse({
      role: 'admin',
      snapshot: snapshot({
        onboardingCompletedAt: old,
        hasDefaultPipeline: false,
      }),
    });
    expect(result.showWelcome).toBe(false);
  });

  it('shows member checklist when profile incomplete', () => {
    const result = resolveWelcomeResponse({
      role: 'member',
      snapshot: snapshot({
        profileCompletedAt: null,
        tourCompletedAt: null,
      }),
    });
    expect(result.showWelcome).toBe(true);
    expect(result.mode).toBe('member_getting_started');
    expect(result.checklist).toHaveLength(2);
  });
});
