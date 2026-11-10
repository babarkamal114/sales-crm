'use client';

import { cn } from '@/lib/utils';

const BUILTIN = [
  { id: 'all', label: 'All companies' },
  { id: 'mine', label: 'My companies' },
  { id: 'customers', label: 'Customers' },
  { id: 'open_deals', label: 'With open deals' },
  { id: 'stale', label: 'No contact in 14 days' },
] as const;

export type CompanyBuiltinListId = (typeof BUILTIN)[number]['id'];

export function CompaniesSmartListTabs({
  active,
  counts,
  onSelect,
}: {
  active: string;
  counts: Record<string, number | undefined>;
  onSelect: (id: CompanyBuiltinListId) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {BUILTIN.map((tab) => {
        const selected = active === tab.id;
        const count = counts[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            aria-selected={selected}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-[13px] font-semibold',
              selected
                ? 'border-line bg-white text-ink-900 shadow-card'
                : 'border-transparent text-ink-500 hover:bg-panel hover:text-ink-900',
            )}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
            {count != null ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[12px] font-bold',
                  selected ? 'bg-brand-50 text-brand-700' : 'bg-soft text-ink-600',
                )}
              >
                {count.toLocaleString()}
              </span>
            ) : null}
          </button>
        );
      })}
      <button
        type="button"
        className="inline-flex h-9 shrink-0 items-center rounded-xl px-3 text-[13px] font-semibold text-brand-600 hover:bg-brand-50"
      >
        + Save view
      </button>
    </div>
  );
}
