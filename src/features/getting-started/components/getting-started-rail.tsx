'use client';

import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DashboardWelcomeChecklistItem } from '@/domain/dashboard/types';
import { stepMeta } from '@/features/getting-started/welcome-step-meta';
import { cn } from '@/lib/utils';

export function GettingStartedRail({
  items,
  expandedId,
  onSelectStep,
  progress,
}: {
  items: DashboardWelcomeChecklistItem[];
  expandedId: string | null;
  onSelectStep: (id: string) => void;
  progress?: { completed: number; total: number };
}) {
  const next = items.find((item) => !item.done);
  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  return (
    <aside className="xl:sticky xl:top-24 xl:self-start">
      <div className="rounded-xl2 border border-line/60 bg-white p-6 shadow-panel">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-brand-50">
            <Sparkles className="size-4 text-brand-600" strokeWidth={2} aria-hidden />
          </span>
          <div>
            <p className="text-[13px] font-extrabold text-ink-900">Setup guide</p>
            <p className="text-[11.5px] font-medium text-ink-500">Jump to any step</p>
          </div>
        </div>

        {progress ? (
          <div className="mt-5 space-y-2.5" aria-live="polite">
            <div className="flex items-center justify-between gap-2 text-[12px] font-semibold">
              <span className="text-brand-700">
                {progress.completed} of {progress.total} complete
              </span>
              <span className="text-ink-400">{progressPercent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-soft">
              <div
                className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}

        {next ? (
          <Button
            type="button"
            className="mt-5 w-full"
            onClick={() => onSelectStep(next.id)}
          >
            Continue: {stepMeta(next.id).shortLabel}
          </Button>
        ) : null}

        <ul className="mt-5 space-y-1" role="list">
          {items.map((item, index) => {
            const meta = stepMeta(item.id);
            const Icon = meta.icon;
            const active = expandedId === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectStep(item.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                    active && 'bg-brand-50 ring-1 ring-brand-200/80',
                    !active && 'hover:bg-soft/80',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                      item.done
                        ? 'bg-mint-100 text-mint-800'
                        : active
                          ? 'bg-brand-600 text-white'
                          : 'bg-soft text-ink-500',
                    )}
                  >
                    {item.done ? (
                      <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <Icon className="size-3.5 shrink-0 text-ink-400" aria-hidden />
                      <span
                        className={cn(
                          'truncate text-[12.5px] font-bold',
                          item.done ? 'text-ink-500' : 'text-ink-900',
                        )}
                      >
                        {meta.shortLabel}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {next ? (
          <div className="mt-6 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3.5">
            <p className="text-[10px] font-bold tracking-wide text-brand-700 uppercase">Tip</p>
            <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-brand-900/90">
              {stepMeta(next.id).tip}
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-mint-100 bg-mint-50/70 px-3 py-3">
            <p className="text-[12px] font-bold text-mint-800">All steps complete</p>
          </div>
        )}
      </div>
    </aside>
  );
}
