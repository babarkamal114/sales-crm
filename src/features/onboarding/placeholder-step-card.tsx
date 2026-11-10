import type { LucideIcon } from 'lucide-react';
import { OnboardingInfoPanel } from '@/components/onboarding/onboarding-layout';

export function PlaceholderStepCard({
  icon: Icon,
  title,
  body,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  hint?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-4 rounded-xl2 border border-line/60 bg-soft/30 p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl2 bg-white shadow-chip">
          <Icon className="size-5 text-brand-600" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-[14px] font-bold text-ink-900">{title}</p>
          <p className="mt-1 text-[13px] font-medium leading-relaxed text-ink-600">
            {body}
          </p>
        </div>
      </div>
      {hint ? (
        <OnboardingInfoPanel title="Tip" tone="soft">
          {hint}
        </OnboardingInfoPanel>
      ) : null}
    </div>
  );
}
