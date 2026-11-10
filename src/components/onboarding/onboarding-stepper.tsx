'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import {
  ONBOARDING_STEP,
  PATH_A_ADMIN_STEPS,
  PATH_A_OPTIONAL_STEPS,
  onboardingStepPath,
  type OnboardingStepSlug,
} from '@/domain/onboarding/steps';
import {
  getOnboardingProgressPercent,
  getOnboardingStepDefinition,
} from '@/features/onboarding/step-content';

function stepReachable(input: {
  step: OnboardingStepSlug;
  current: OnboardingStepSlug;
  completed: readonly OnboardingStepSlug[];
}): boolean {
  if (input.completed.includes(input.step) || input.step === input.current) {
    return true;
  }
  const linear = PATH_A_ADMIN_STEPS.filter(
    (s) => s !== ONBOARDING_STEP.complete,
  ) as OnboardingStepSlug[];
  const targetIdx = linear.indexOf(input.step);
  const currentIdx = linear.indexOf(input.current);
  if (targetIdx === -1 || currentIdx === -1) {
    return false;
  }
  return targetIdx <= currentIdx;
}

function dotState(
  step: OnboardingStepSlug,
  current: OnboardingStepSlug,
  completed: readonly OnboardingStepSlug[],
): 'complete' | 'current' | 'upcoming' {
  if (completed.includes(step)) {
    return 'complete';
  }
  if (step === current) {
    return 'current';
  }
  return 'upcoming';
}

export function OnboardingStepper({
  currentStep,
  completedSteps,
  stepIndex,
  stepTotal,
}: {
  currentStep: OnboardingStepSlug;
  completedSteps: readonly OnboardingStepSlug[];
  stepIndex: number;
  stepTotal: number;
}) {
  const steps = PATH_A_ADMIN_STEPS.filter((s) => s !== ONBOARDING_STEP.complete);
  const percent = getOnboardingProgressPercent({
    stepIndex,
    stepTotal,
    completedSteps,
  });

  return (
    <Card className="mb-0 border-line/50 bg-white p-4 shadow-panel sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[12px] font-bold text-ink-500">
          Step {stepIndex} of {stepTotal}
        </p>
        <p className="text-[12px] font-bold text-brand-600">{percent}% complete</p>
      </div>

      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-soft">
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-7">
        {steps.map((slug) => {
          const def = getOnboardingStepDefinition(slug);
          const StepIcon = def.icon;
          const state = dotState(slug, currentStep, completedSteps);
          const optional = PATH_A_OPTIONAL_STEPS.includes(slug);
          const reachable = stepReachable({
            step: slug,
            current: currentStep,
            completed: completedSteps,
          });

          const tileClass = cn(
            'flex items-center gap-2 rounded-xl2 border px-2.5 py-2 transition-colors sm:px-3 sm:py-2.5',
            state === 'complete' && 'border-mint-200 bg-mint-50/60',
            state === 'current' && 'border-brand-300 bg-brand-50/80 ring-1 ring-brand-100',
            state === 'upcoming' && 'border-line/70 bg-soft/40',
            reachable && state !== 'current' && 'hover:border-brand-200',
          );

          const content = (
            <>
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-lg',
                  state === 'complete' && 'bg-mint-600 text-white',
                  state === 'current' && 'bg-brand-500 text-white',
                  state === 'upcoming' && 'border border-line bg-white text-ink-400',
                )}
              >
                {state === 'complete' ? (
                  <Check className="size-3.5" strokeWidth={2.8} />
                ) : (
                  <StepIcon className="size-3.5" strokeWidth={1.9} />
                )}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    'truncate text-[10.5px] font-bold sm:text-[11px]',
                    state === 'complete' && 'text-mint-800',
                    state === 'current' && 'text-brand-800',
                    state === 'upcoming' && 'text-ink-400',
                  )}
                >
                  {def.label}
                </p>
                {optional ? (
                  <p className="text-[9px] font-bold uppercase text-ink-400">Opt</p>
                ) : null}
              </div>
            </>
          );

          if (reachable) {
            return (
              <Link
                key={slug}
                href={onboardingStepPath(slug)}
                className={tileClass}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                {content}
              </Link>
            );
          }

          return (
            <div key={slug} className={tileClass} aria-current={state === 'current' ? 'step' : undefined}>
              {content}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
