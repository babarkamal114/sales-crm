'use client';

import Link from 'next/link';
import { ArrowRight, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DashboardWelcomeResponse } from '@/domain/dashboard/types';

function firstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part ?? fullName;
}

export function CrmGettingStartedHero({
  fullName,
  welcome,
}: {
  fullName: string;
  welcome: DashboardWelcomeResponse;
}) {
  const progress = welcome.progress;
  const percent =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : welcome.showWelcome
        ? 0
        : 100;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  const subtitle =
    welcome.subtitle ??
    'Complete each step below — everything stays on this page, no onboarding wizard.';

  return (
    <div className="relative overflow-hidden rounded-xl2 bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700 p-6 sm:p-8">
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 25%, white 0 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />

      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-white/75 uppercase">
            <Rocket className="size-3.5" strokeWidth={2.2} aria-hidden />
            Getting started
          </p>
          <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-white sm:text-[28px]">
            {welcome.showWelcome ? `Hi, ${firstName(fullName)}` : 'Workspace ready'}
          </h1>
          <p className="mt-2 max-w-xl text-[14px] font-medium leading-relaxed text-white/88">
            {welcome.showWelcome ? subtitle : 'All essential setup steps are complete.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              asChild
              variant="secondary"
              className="h-11 rounded-2xl border-0 bg-white px-5 text-[13.5px] font-bold text-brand-700 shadow-chip hover:bg-white/90"
            >
              <Link href="/">
                {welcome.showWelcome ? 'View dashboard' : 'Open dashboard'}
                <ArrowRight className="size-4" strokeWidth={2.4} aria-hidden />
              </Link>
            </Button>
            {welcome.showWelcome && progress && progress.total > progress.completed ? (
              <span className="inline-flex h-11 items-center rounded-2xl border border-white/25 bg-white/10 px-4 text-[12.5px] font-semibold text-white/90">
                {progress.total - progress.completed} step
                {progress.total - progress.completed === 1 ? '' : 's'} left
              </span>
            ) : null}
          </div>
        </div>

        {progress && progress.total > 0 ? (
          <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white backdrop-blur-sm">
            <div
              className="relative size-[72px]"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${percent}% setup complete`}
            >
              <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  strokeWidth={10}
                  stroke="rgba(255,255,255,.22)"
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
                  className="transition-[stroke-dashoffset] duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[17px] leading-none font-extrabold">{percent}%</span>
              </div>
            </div>
            <div>
              <p className="text-[13px] font-bold">
                {progress.completed} of {progress.total}
              </p>
              <p className="text-[12px] font-medium text-white/75">
                {percent >= 100 ? 'All set' : 'In progress'}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
