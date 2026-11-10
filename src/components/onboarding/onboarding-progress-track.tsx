'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ONBOARDING_STEP,
  PATH_A_ADMIN_STEPS,
  PATH_A_OPTIONAL_STEPS,
  onboardingStepPath,
  type OnboardingStepSlug,
} from '@/domain/onboarding/steps';
import { getOnboardingStepDefinition } from '@/features/onboarding/step-content';

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

export function OnboardingProgressTrack({
  currentStep,
  completedSteps,
  stepIndex,
  stepTotal,
  percent,
}: {
  currentStep: OnboardingStepSlug;
  completedSteps: readonly OnboardingStepSlug[];
  stepIndex: number;
  stepTotal: number;
  percent: number;
}) {
  const steps = PATH_A_ADMIN_STEPS.filter((s) => s !== ONBOARDING_STEP.complete);

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-ink-400">
            Setup
          </p>
          <p className="text-[13px] font-bold text-ink-700">
            Step {stepIndex} of {stepTotal}
          </p>
        </div>
        <p className="text-[28px] font-extrabold leading-none tabular-nums text-brand-600">
          {percent}%
        </p>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-soft">
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-4 flex gap-1 overflow-x-auto scroll-thin pb-1">
        {steps.map((slug) => {
          const def = getOnboardingStepDefinition(slug);
          const done = completedSteps.includes(slug);
          const current = slug === currentStep;
          const optional = PATH_A_OPTIONAL_STEPS.includes(slug);
          const reachable = stepReachable({
            step: slug,
            current: currentStep,
            completed: completedSteps,
          });

          const pill = (
            <span
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-all',
                current && 'border-brand-500 bg-brand-500 text-white shadow-chip',
                !current && done && 'border-mint-200 bg-mint-50 text-mint-800',
                !current && !done && 'border-line/80 bg-white text-ink-500',
              )}
            >
              {done ? (
                <Check className="size-3" strokeWidth={2.5} />
              ) : (
                <span className="size-1.5 rounded-full bg-current opacity-60" />
              )}
              {def.label}
              {optional ? <span className="opacity-60">· opt</span> : null}
            </span>
          );

          if (reachable && !current) {
            return (
              <Link key={slug} href={onboardingStepPath(slug)} className="shrink-0">
                {pill}
              </Link>
            );
          }

          return (
            <span key={slug} className="shrink-0" aria-current={current ? 'step' : undefined}>
              {pill}
            </span>
          );
        })}
      </div>
    </div>
  );
}
