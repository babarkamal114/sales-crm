'use client';

import { ChevronRight, LayoutDashboard } from 'lucide-react';
import type { OnboardingStepSlug } from '@/domain/onboarding/steps';
import { Card, CardContent } from '@/components/ui/card';
import {
  CRM_ONBOARDING_GLANCE,
  getOnboardingStepDefinition,
  getUpcomingStepLabels,
} from '@/features/onboarding/step-content';

export function OnboardingRail({
  step,
  completedSteps,
}: {
  step: OnboardingStepSlug;
  completedSteps: readonly OnboardingStepSlug[];
}) {
  const def = getOnboardingStepDefinition(step);
  const upcoming = getUpcomingStepLabels({ currentStep: step, completedSteps });

  return (
    <aside className="space-y-5 xl:sticky xl:top-6" aria-label="Step guidance">
      <Card className="border-brand-100 bg-brand-50/40 shadow-panel">
        <CardContent className="pt-5">
          <p className="text-[13px] font-extrabold text-brand-800">{def.railTitle}</p>
          <ul className="mt-3 space-y-2.5">
            {def.railItems.map((item) => (
              <li
                key={item.label}
                className="rounded-xl border border-brand-100/80 bg-white/60 px-3 py-2.5"
              >
                <p className="text-[12px] font-bold text-ink-900">{item.label}</p>
                <p className="mt-0.5 text-[11.5px] font-medium leading-snug text-ink-500">
                  {item.detail}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {upcoming.length > 0 ? (
        <Card className="shadow-panel">
          <CardContent className="pt-5">
            <p className="text-[14px] font-bold text-ink-900">Still to do</p>
            <ul className="mt-3 space-y-2">
              {upcoming.map((label) => (
                <li
                  key={label}
                  className="flex items-center gap-2 text-[12.5px] font-medium text-ink-500"
                >
                  <span className="size-1.5 rounded-full bg-ink-300" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-panel">
        <CardContent className="pt-5">
          <div className="mb-3 flex items-center gap-2">
            <LayoutDashboard className="size-4 text-brand-600" strokeWidth={1.9} />
            <h2 className="text-[14px] font-bold text-ink-900">CRM at a glance</h2>
          </div>
          <ul className="space-y-2.5">
            {CRM_ONBOARDING_GLANCE.map((item) => (
              <li
                key={item.label}
                className="rounded-xl border border-line/80 bg-soft/40 px-3 py-2.5"
              >
                <p className="text-[12px] font-bold text-ink-900">{item.label}</p>
                <p className="mt-0.5 text-[11.5px] font-medium leading-snug text-ink-500">
                  {item.detail}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="shadow-panel">
        <CardContent className="pt-5">
          <p className="text-[12.5px] font-medium leading-snug text-ink-500">
            Questions while you set up? Our team knows sponsorship sales workflows.
          </p>
          <a
            href="mailto:support@sponsoro.co.uk"
            className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-bold text-brand-600 hover:text-brand-700"
          >
            Email support
            <ChevronRight className="size-3.5" strokeWidth={2.4} />
          </a>
        </CardContent>
      </Card>
    </aside>
  );
}
