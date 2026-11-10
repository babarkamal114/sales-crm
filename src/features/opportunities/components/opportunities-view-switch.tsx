'use client';

import { Kanban, LayoutList, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const VIEWS = [
  { value: 'board' as const, label: 'Board', Icon: Kanban },
  { value: 'list' as const, label: 'List', Icon: LayoutList },
  { value: 'forecast' as const, label: 'Forecast', Icon: TrendingUp },
];

export function OpportunitiesViewSwitch({
  value,
  onChange,
}: {
  value: 'board' | 'list' | 'forecast';
  onChange: (view: 'board' | 'list' | 'forecast') => void;
}) {
  return (
    <div
      role="group"
      aria-label="View"
      className="inline-flex rounded-xl border border-white/70 bg-white/75 p-0.5 shadow-[0_1px_2px_rgba(25,29,40,0.06)] backdrop-blur-xl"
    >
      {VIEWS.map(({ value: optionValue, label, Icon }) => {
        const pressed = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(optionValue)}
            className={cn(
              'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[9px] px-3 text-[13px] font-medium text-ink-500 transition-[box-shadow,color,background] hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
              pressed && 'bg-white font-semibold text-ink-900 shadow-[0_1px_3px_rgba(25,29,40,0.12)]',
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
