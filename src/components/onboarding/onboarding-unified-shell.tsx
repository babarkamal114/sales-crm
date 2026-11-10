import type { ReactNode } from 'react';
import type { OnboardingStepSlug } from '@/domain/onboarding/steps';
import {
  OnboardingBrandPanel,
  OnboardingMobileBrandStrip,
} from '@/components/onboarding/onboarding-brand-panel';

export function OnboardingUnifiedShell({
  userName,
  organisationName,
  step,
  stepIndex,
  stepTotal,
  completedSteps,
  headerActions,
  children,
}: {
  userName: string;
  organisationName: string;
  step: OnboardingStepSlug;
  stepIndex: number;
  stepTotal: number;
  completedSteps: readonly OnboardingStepSlug[];
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden lg:flex-row">
      <OnboardingMobileBrandStrip organisationName={organisationName} step={step} />

      <aside className="hidden h-dvh min-h-0 shrink-0 overflow-hidden lg:flex lg:w-[46%] xl:w-[42%] 2xl:w-[40%]">
        <OnboardingBrandPanel
          userName={userName}
          organisationName={organisationName}
          step={step}
          stepIndex={stepIndex}
          stepTotal={stepTotal}
          completedSteps={completedSteps}
        />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-line/70 bg-[#f4f5f9] lg:border-l">
        <header className="flex shrink-0 items-center justify-between border-b border-line/60 bg-white px-5 py-3.5 sm:px-8">
          <p className="truncate text-[13px] font-bold text-ink-700">{organisationName}</p>
          {headerActions}
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto scroll-thin">
          <div className="mx-auto w-full max-w-[1080px] px-5 py-6 sm:px-8 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
