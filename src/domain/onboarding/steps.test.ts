import { describe, expect, it } from 'vitest';
import {
  ONBOARDING_STEP,
  previousOnboardingStep,
} from '@/domain/onboarding/steps';

describe('previousOnboardingStep', () => {
  it('returns null on first Path A step', () => {
    expect(
      previousOnboardingStep({
        current: ONBOARDING_STEP.profile,
        path: 'A',
      }),
    ).toBeNull();
  });

  it('walks Path A linearly', () => {
    expect(
      previousOnboardingStep({
        current: ONBOARDING_STEP.organisation,
        path: 'A',
      }),
    ).toBe(ONBOARDING_STEP.profile);
    expect(
      previousOnboardingStep({
        current: ONBOARDING_STEP.pipeline,
        path: 'A',
      }),
    ).toBe(ONBOARDING_STEP.agreements);
  });

  it('returns tools before complete', () => {
    expect(
      previousOnboardingStep({
        current: ONBOARDING_STEP.complete,
        path: 'A',
      }),
    ).toBe(ONBOARDING_STEP.tools);
  });

  it('supports Path B', () => {
    expect(
      previousOnboardingStep({
        current: ONBOARDING_STEP.tour,
        path: 'B',
      }),
    ).toBe(ONBOARDING_STEP.profile);
  });
});
