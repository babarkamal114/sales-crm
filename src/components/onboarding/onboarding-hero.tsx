import { ONBOARDING_STEP, type OnboardingStepSlug } from '@/domain/onboarding/steps';
import {
  getOnboardingProgressPercent,
  getOnboardingStepDefinition,
} from '@/features/onboarding/step-content';

export function OnboardingHero({
  step,
  userName,
  organisationName,
  stepIndex,
  stepTotal,
  completedSteps,
}: {
  step: OnboardingStepSlug;
  userName: string;
  organisationName: string;
  stepIndex: number;
  stepTotal: number;
  completedSteps: readonly OnboardingStepSlug[];
}) {
  const def = getOnboardingStepDefinition(step);
  const percent = getOnboardingProgressPercent({
    stepIndex,
    stepTotal,
    completedSteps,
  });
  const firstName = userName.trim().split(/\s+/)[0] || userName;
  const headline =
    step === ONBOARDING_STEP.profile ? `Welcome, ${firstName}` : def.title;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const StepIcon = def.icon;

  return (
    <div className="relative mb-5 overflow-hidden rounded-xl2 bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 p-6 sm:p-7">
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 25%, white 0 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
        aria-hidden
      />

      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-white/15">
              <StepIcon className="size-4 text-white" strokeWidth={1.9} />
            </span>
            <p className="text-[12px] font-bold text-white/80">
              Setting up {organisationName}
            </p>
          </div>
          <h1 className="text-[24px] font-extrabold tracking-tight text-white">{headline}</h1>
          <p className="mt-1.5 max-w-xl text-[14px] font-medium text-white/85">
            {def.heroHint}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-4 text-white">
          <div
            className="relative size-[78px]"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Step ${stepIndex} of ${stepTotal}`}
          >
            <svg viewBox="0 0 100 100" className="size-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth={10}
                stroke="rgba(255,255,255,.25)"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth={10}
                stroke="white"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="seg-fill"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[18px] font-extrabold leading-none tnum">{percent}%</span>
            </div>
          </div>
          <div>
            <p className="text-[13px] font-bold">
              Step {stepIndex} of {stepTotal}
            </p>
            <p className="text-[12px] font-medium text-white/75">{def.label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
