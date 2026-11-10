'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SponsoroBrandLogo } from '@/components/layouts/sponsoro-logo';
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
import { onboardingBrandDefaults } from '@/lib/onboarding/brand-panel-content';

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

export function OnboardingBrandPanel({
  userName,
  organisationName,
  step,
  stepIndex,
  stepTotal,
  completedSteps,
}: {
  userName: string;
  organisationName: string;
  step: OnboardingStepSlug;
  stepIndex: number;
  stepTotal: number;
  completedSteps: readonly OnboardingStepSlug[];
}) {
  const def = getOnboardingStepDefinition(step);
  const firstName = userName.trim().split(/\s+/)[0] || userName;
  const headline =
    step === ONBOARDING_STEP.profile ? `Welcome, ${firstName}` : def.title;
  const percent = getOnboardingProgressPercent({
    stepIndex,
    stepTotal,
    completedSteps,
  });

  const timelineSteps = PATH_A_ADMIN_STEPS.filter((s) => s !== ONBOARDING_STEP.complete);

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col justify-between overflow-hidden p-10 xl:p-12 2xl:p-14">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700" />
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, white 0 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 top-1/3 size-56 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />

      <div className="relative">
        <SponsoroBrandLogo height={40} variant="light" />
        <p className="mt-4 text-[12px] font-bold text-white/75">
          {organisationName}
        </p>
      </div>

      <div className="relative my-6 text-white xl:my-8">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase">
          {onboardingBrandDefaults.badge}
          <span className="text-white/60">·</span>
          <span className="text-white/90">{onboardingBrandDefaults.setupMinutes}</span>
        </p>
        <h1 className="max-w-md text-[28px] leading-[1.08] font-extrabold tracking-tight xl:text-[34px]">
          {headline}
        </h1>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed font-medium text-white/85 xl:text-[15px]">
          {def.heroHint}
        </p>

        <div className="mt-8 max-w-sm">
          <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-white/80">
            <span>Progress</span>
            <span>{percent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <nav className="mt-8 hidden max-w-sm space-y-1 xl:block" aria-label="Setup progress">
          {timelineSteps.map((slug) => {
            const item = getOnboardingStepDefinition(slug);
            const done = completedSteps.includes(slug);
            const current = slug === step;
            const optional = PATH_A_OPTIONAL_STEPS.includes(slug);
            const reachable = stepReachable({
              step: slug,
              current: step,
              completed: completedSteps,
            });
            const rowClass = cn(
              'flex items-center gap-3 rounded-xl2 px-3 py-2.5 text-[13px] font-semibold transition-colors',
              current && 'bg-white/15 text-white',
              !current && done && 'text-white/90',
              !current && !done && 'text-white/55',
            );

            const inner = (
              <>
                <span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-xl text-[11px] font-extrabold',
                    done && 'bg-white text-brand-700',
                    current && !done && 'bg-white/20 text-white ring-2 ring-white/30',
                    !done && !current && 'bg-white/10 text-white/50',
                  )}
                >
                  {done ? <Check className="size-4" strokeWidth={2.5} /> : item.label[0]}
                </span>
                <span className="min-w-0 flex-1">{item.label}</span>
                {optional ? (
                  <span className="text-[9px] font-bold uppercase tracking-wide text-white/45">
                    Optional
                  </span>
                ) : null}
              </>
            );

            if (reachable && !current) {
              return (
                <Link key={slug} href={onboardingStepPath(slug)} className={rowClass}>
                  {inner}
                </Link>
              );
            }

            return (
              <div key={slug} className={rowClass} aria-current={current ? 'step' : undefined}>
                {inner}
              </div>
            );
          })}
        </nav>
      </div>

      <p className="relative text-[12px] font-medium text-white/65">
        {onboardingBrandDefaults.trustLine}
      </p>
    </div>
  );
}

export function OnboardingMobileBrandStrip({
  organisationName,
  step,
}: {
  organisationName: string;
  step: OnboardingStepSlug;
}) {
  const def = getOnboardingStepDefinition(step);
  return (
    <div className="relative shrink-0 overflow-hidden px-5 py-4 lg:hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700" />
      <div className="relative flex items-center justify-between gap-3">
        <SponsoroBrandLogo height={32} variant="light" />
        <div className="min-w-0 text-right">
          <p className="truncate text-[11px] font-bold text-white/75">{organisationName}</p>
          <p className="truncate text-[12px] font-bold text-white">{def.label}</p>
        </div>
      </div>
    </div>
  );
}
