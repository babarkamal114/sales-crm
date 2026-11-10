'use client';

import type { DashboardWelcomeResponse } from '@/domain/dashboard/types';

export function GettingStartedProgressBar({
  progress,
}: {
  progress: NonNullable<DashboardWelcomeResponse['progress']>;
}) {
  const percent = Math.round((progress.completed / progress.total) * 100);

  return (
    <div className="mb-5 rounded-xl2 border border-line/60 bg-white px-5 py-4 shadow-panel">
      <div className="flex items-center justify-between gap-2 text-[12px] font-semibold text-ink-600">
        <span aria-live="polite">
          {progress.completed} of {progress.total} complete
        </span>
        <span className="text-brand-700">{percent}%</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-soft"
        role="progressbar"
        aria-valuenow={progress.completed}
        aria-valuemin={0}
        aria-valuemax={progress.total}
      >
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
