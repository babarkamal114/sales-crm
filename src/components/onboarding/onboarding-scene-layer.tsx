'use client';

import type { OnboardingStepSlug } from '@/domain/onboarding/steps';
import { ONBOARDING_STEP } from '@/domain/onboarding/steps';

function SceneCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`onboarding-scene-card rounded-xl3 border border-white/70 bg-white/80 p-4 shadow-panel backdrop-blur-md ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

export function OnboardingSceneLayer({
  step,
  organisationName,
  userName,
}: {
  step: OnboardingStepSlug;
  organisationName: string;
  userName: string;
}) {
  const firstName = userName.trim().split(/\s+/)[0] || 'You';

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden onboarding-canvas-bg" aria-hidden>
      {step === ONBOARDING_STEP.profile ? (
        <>
          <SceneCard className="absolute left-[4%] top-[14%] w-[200px] -rotate-6 opacity-90 max-lg:hidden">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">Team</p>
            <div className="mt-2 flex -space-x-2">
              {['SK', 'AM', 'JR'].map((initials) => (
                <span
                  key={initials}
                  className="grid size-9 place-items-center rounded-full border-2 border-white bg-brand-50 text-[11px] font-extrabold text-brand-700"
                >
                  {initials}
                </span>
              ))}
              <span className="grid size-9 place-items-center rounded-full border-2 border-dashed border-line bg-soft text-[11px] font-extrabold text-ink-500">
                +
              </span>
            </div>
            <p className="mt-2 text-[12px] font-bold text-ink-800">{firstName} joins the roster</p>
          </SceneCard>
          <SceneCard className="absolute right-[6%] top-[22%] w-[220px] rotate-3 opacity-85 max-xl:hidden">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-brand-500" />
              <p className="text-[11px] font-bold text-ink-600">Activity feed</p>
            </div>
            <p className="mt-2 text-[13px] font-semibold text-ink-900">
              {firstName} updated their profile
            </p>
            <p className="text-[11px] font-medium text-ink-400">Just now</p>
          </SceneCard>
        </>
      ) : null}

      {step === ONBOARDING_STEP.organisation ? (
        <SceneCard className="absolute right-[5%] top-[16%] w-[240px] rotate-2 opacity-90 max-lg:hidden">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-500 text-lg font-extrabold text-white">
            {organisationName.slice(0, 1).toUpperCase()}
          </div>
          <p className="mt-3 text-[15px] font-extrabold text-ink-900">{organisationName}</p>
          <p className="text-[11px] font-medium text-ink-500">Sponsor-facing profile</p>
        </SceneCard>
      ) : null}

      {step === ONBOARDING_STEP.pipeline ? (
        <div className="absolute left-[3%] top-[12%] flex gap-2 opacity-80 max-lg:hidden">
          {['Prospect', 'Proposal', 'Signed'].map((col, i) => (
            <SceneCard key={col} className={`w-[120px] ${i === 1 ? '-mt-4 rotate-1' : '-rotate-2'}`}>
              <p className="text-[10px] font-bold uppercase text-ink-400">{col}</p>
              <div className="mt-2 space-y-1.5">
                <div className="h-8 rounded-lg bg-soft" />
                {i === 1 ? <div className="h-8 rounded-lg border border-brand-100 bg-brand-50/80" /> : null}
              </div>
            </SceneCard>
          ))}
        </div>
      ) : null}

      {step === ONBOARDING_STEP.complete
        ? ['Opportunities', '£124k', 'Renewals'].map((label, i) => (
            <div
              key={label}
              className="absolute max-lg:hidden"
              style={{
                left: `${8 + i * 12}%`,
                top: `${18 + (i % 2) * 8}%`,
              }}
            >
              <SceneCard
                className={`w-[140px] opacity-75 ${i % 2 === 0 ? '-rotate-6' : 'rotate-6'}`}
              >
                <p className="text-[10px] font-bold uppercase text-ink-400">Dashboard</p>
                <p className="mt-1 text-[18px] font-extrabold text-ink-900">{label}</p>
              </SceneCard>
            </div>
          ))
        : null}

      <div className="onboarding-glow-orb absolute -left-20 bottom-[10%] size-64 rounded-full bg-brand-400/20 blur-3xl" />
      <div className="onboarding-glow-orb absolute -right-16 top-[8%] size-56 rounded-full bg-brand-500/15 blur-3xl" />
    </div>
  );
}
