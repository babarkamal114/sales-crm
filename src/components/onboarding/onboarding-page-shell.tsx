import type { ReactNode } from 'react';
import type { OnboardingStepSlug } from '@/domain/onboarding/steps';
import { OnboardingHero } from '@/components/onboarding/onboarding-hero';
import {
  OnboardingCard,
  OnboardingFooterNote,
  OnboardingShell,
} from '@/components/onboarding/onboarding-shell-layout';
import { OnboardingRail } from '@/components/onboarding/onboarding-rail';
import { OnboardingStepper } from '@/components/onboarding/onboarding-stepper';

export function OnboardingPageShell({
  step,
  userName,
  organisationName,
  stepIndex,
  stepTotal,
  completedSteps,
  showStepper,
  headerActions,
  children,
  footer,
}: {
  step: OnboardingStepSlug;
  userName: string;
  organisationName: string;
  stepIndex: number;
  stepTotal: number;
  completedSteps: readonly OnboardingStepSlug[];
  showStepper: boolean;
  headerActions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <OnboardingShell organisationName={organisationName} headerActions={headerActions}>
      <OnboardingHero
        step={step}
        userName={userName}
        organisationName={organisationName}
        stepIndex={stepIndex}
        stepTotal={stepTotal}
        completedSteps={completedSteps}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {showStepper ? (
            <OnboardingStepper
              currentStep={step}
              completedSteps={completedSteps}
              stepIndex={stepIndex}
              stepTotal={stepTotal}
            />
          ) : null}

          <OnboardingCard>
            <div className="p-6 sm:p-8">
              {children}
              {footer}
            </div>
          </OnboardingCard>

          <OnboardingFooterNote />
        </div>

        <OnboardingRail step={step} completedSteps={completedSteps} />
      </div>
    </OnboardingShell>
  );
}
