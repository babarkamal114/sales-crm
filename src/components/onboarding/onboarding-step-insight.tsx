import type { OnboardingStepSlug } from '@/domain/onboarding/steps';
import { getOnboardingStepDefinition } from '@/features/onboarding/step-content';

export function OnboardingStepInsight({ step }: { step: OnboardingStepSlug }) {
  const def = getOnboardingStepDefinition(step);
  const [first, ...rest] = def.railItems;
  if (!first) {
    return null;
  }

  return (
    <div className="rounded-xl2 border border-brand-100/80 bg-brand-50/40 px-4 py-3.5">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink-500">
        {def.railTitle}
      </p>
      <p className="mt-1 text-[13px] font-bold text-ink-900">{first.label}</p>
      <p className="mt-0.5 text-[12px] font-medium leading-snug text-ink-600">{first.detail}</p>
      {rest.length > 0 ? (
        <p className="mt-2 text-[11px] font-medium text-ink-400">
          +{rest.length} more tip{rest.length > 1 ? 's' : ''} in the checklist after setup
        </p>
      ) : null}
    </div>
  );
}
