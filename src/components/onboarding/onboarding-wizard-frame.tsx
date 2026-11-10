'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import type { OnboardingStepSlug } from '@/domain/onboarding/steps';
import { getOnboardingProgressPercent, getOnboardingStepDefinition } from '@/features/onboarding/step-content';
import { OnboardingProgressTrack } from '@/components/onboarding/onboarding-progress-track';
import { OnboardingSceneLayer } from '@/components/onboarding/onboarding-scene-layer';

export function OnboardingWizardFrame({
  step,
  title,
  description,
  userName,
  organisationName,
  stepIndex,
  stepTotal,
  completedSteps,
  showProgressTrack,
  headerActions,
  insight,
  children,
  footer,
}: {
  step: OnboardingStepSlug;
  title: string;
  description: string;
  userName: string;
  organisationName: string;
  stepIndex: number;
  stepTotal: number;
  completedSteps: readonly OnboardingStepSlug[];
  showProgressTrack: boolean;
  headerActions?: ReactNode;
  insight?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const def = getOnboardingStepDefinition(step);
  const StepIcon = def.icon;
  const percent = getOnboardingProgressPercent({
    stepIndex,
    stepTotal,
    completedSteps,
  });

  return (
    <div className="onboarding-canvas relative flex min-h-dvh flex-col">
      <OnboardingSceneLayer
        step={step}
        organisationName={organisationName}
        userName={userName}
      />

      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <Image
            src="/logo/sponsoro-logo.svg"
            alt="CRM"
            width={108}
            height={28}
            className="h-7 w-auto"
          />
          <span className="hidden h-4 w-px bg-ink-900/10 sm:block" />
          <span className="hidden max-w-[200px] truncate text-[12px] font-bold text-ink-600 sm:inline">
            {organisationName}
          </span>
        </div>
        {headerActions}
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center px-5 pb-10 pt-2 sm:px-8">
        <div className="w-full max-w-[640px]">
          <div className="onboarding-wizard-panel overflow-hidden rounded-xl4 border border-line/60 bg-white shadow-overlay">
            <div className="h-1 w-full bg-brand-500" aria-hidden />

            <div className="p-6 sm:p-8">
              {showProgressTrack ? (
                <OnboardingProgressTrack
                  currentStep={step}
                  completedSteps={completedSteps}
                  stepIndex={stepIndex}
                  stepTotal={stepTotal}
                  percent={percent}
                />
              ) : null}

              <div className="flex gap-4">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50 text-brand-600 shadow-chip">
                  <StepIcon className="size-7" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <h1 className="text-[26px] font-extrabold tracking-tight text-ink-900 sm:text-[28px]">
                    {title}
                  </h1>
                  <p className="mt-1.5 text-[14px] font-medium leading-relaxed text-ink-500">
                    {description}
                  </p>
                </div>
              </div>

              {insight ? <div className="mt-5">{insight}</div> : null}

              <div className="mt-7">{children}</div>
            </div>

            {footer}
          </div>

          <p className="mt-5 text-center text-[11px] font-medium text-ink-400">
            Encrypted · UK-hosted ·{' '}
            <a href="mailto:support@sponsoro.co.uk" className="text-brand-600 hover:underline">
              Need help?
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
