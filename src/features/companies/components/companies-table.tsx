'use client';

import { ArrowUpDown, Plus, StickyNote, CheckSquare } from 'lucide-react';
import type { CompanyListQuery } from '@/domain/companies/list-query';
import type { CompanyListRow } from '@/domain/companies/list-view';
import { CompanyLogoMark } from '@/features/companies/components/company-logo-mark';
import { formatDateTime } from '@/features/opportunities/lib/format-duration';
import { formatOpportunityValue } from '@/features/opportunities/lib/format-money';
import { StatusPill } from '@/components/ui/status-pill';
import { cn } from '@/lib/utils';

const LIFECYCLE: Record<string, { label: string; tone: 'mint' | 'brand' | 'amber' | 'neutral' }> = {
  customer: { label: 'Customer', tone: 'mint' },
  prospect: { label: 'Prospect', tone: 'brand' },
  former_customer: { label: 'Former', tone: 'amber' },
  not_a_fit: { label: 'Not a fit', tone: 'neutral' },
};

export function CompaniesTable({
  rows,
  loading,
  error,
  sort,
  dir,
  selected,
  focusedRowIndex,
  onSort,
  onOpen,
  onToggleSelect,
  onRetry,
  filteredEmpty,
}: {
  rows: CompanyListRow[];
  loading: boolean;
  error: boolean;
  sort: CompanyListQuery['sort'];
  dir: CompanyListQuery['dir'];
  selected: Set<string>;
  focusedRowIndex: number;
  onSort: (field: NonNullable<CompanyListQuery['sort']>) => void;
  onOpen: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onRetry: () => void;
  filteredEmpty?: boolean;
}) {
  if (loading && rows.length === 0) {
    return (
      <div className="space-y-2 px-4 py-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-soft/80" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-[14px] font-bold text-rose-800">Could not load companies</p>
        <button type="button" className="mt-2 text-[13px] font-semibold text-brand-600 underline" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <h3 className="text-[17px] font-extrabold text-ink-900">
          {filteredEmpty ? 'No companies match your filters' : 'No companies yet'}
        </h3>
        <p className="mt-1 text-[13px] text-ink-500">
          {filteredEmpty
            ? 'Try clearing search or choosing a different smart list.'
            : 'Import a list or add your first company.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1180px] w-full border-collapse">
        <thead className="sticky top-0 z-[1] bg-soft/95 text-left text-[12px] font-semibold text-ink-500">
          <tr>
            <th className="w-11 px-4 py-2.5">
              <span className="sr-only">Select</span>
            </th>
            <SortHeader col="name" label="Company" sort={sort} dir={dir} onSort={onSort} />
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Industry</th>
            <th className="px-3 py-2.5">Contacts</th>
            <SortHeader col="deals" label="Open pipeline" sort={sort} dir={dir} onSort={onSort} />
            <SortHeader col="won" label="Won to date" sort={sort} dir={dir} onSort={onSort} />
            <th className="px-3 py-2.5">Owner</th>
            <th className="px-3 py-2.5">Location</th>
            <SortHeader col="activity" label="Last activity" sort={sort} dir={dir} onSort={onSort} />
            <th className="px-3 py-2.5 w-24">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const life = LIFECYCLE[row.lifecycle] ?? LIFECYCLE.prospect!;
            const isSelected = selected.has(row.id);
            const isFocused = index === focusedRowIndex;
            const stale =
              row.lastActivityAt &&
              Date.now() - new Date(row.lastActivityAt).getTime() > 14 * 86400000;
            return (
              <tr
                key={row.id}
                className={cn(
                  'group cursor-pointer border-b border-line/70',
                  isSelected && 'bg-[#F4F5FD]',
                  isFocused && 'bg-brand-50/80',
                  !isSelected && !isFocused && 'hover:bg-white',
                )}
                onClick={() => onOpen(row.id)}
              >
                <td className="px-4 py-2.5" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.name}`}
                    checked={isSelected}
                    onChange={() => onToggleSelect(row.id)}
                    className="size-[18px] rounded border-line accent-brand-600"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex min-w-[220px] items-center gap-2.5">
                    <CompanyLogoMark name={row.name} domain={row.domain} className="size-8 text-[11px]" />
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold text-ink-900">{row.name}</p>
                      <p className="truncate text-[12px] text-ink-500">{row.domain ?? '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <StatusPill status={life.label} />
                </td>
                <td className="px-3 py-2.5 text-[13px] text-ink-700">
                  {[row.industry, row.sizeBand].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    {row.contactInitials.slice(0, 3).map((initial, i) => (
                      <span
                        key={`${row.id}-${i}`}
                        className="grid size-7 place-items-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700"
                      >
                        {initial}
                      </span>
                    ))}
                    {row.contactCount > 3 ? (
                      <span className="text-[12px] font-semibold text-ink-500">+{row.contactCount - 3}</span>
                    ) : null}
                    {row.contactCount === 0 ? (
                      <span className="text-[12px] text-ink-400">—</span>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[13px]">
                  <span className="num block font-bold text-ink-900">
                    {formatOpportunityValue(row.openDealsValuePence, 'GBP')}
                  </span>
                  <span className="text-[12px] text-ink-500">{row.topOpenDealStage ?? '—'}</span>
                </td>
                <td className="num px-3 py-2.5 text-[13px] font-bold text-ink-900">
                  {formatOpportunityValue(row.wonValueTotalPence, 'GBP')}
                </td>
                <td className="px-3 py-2.5 text-[13px] font-medium">{row.owner.fullName}</td>
                <td className="px-3 py-2.5 text-[13px] text-ink-600">{row.city ?? '—'}</td>
                <td
                  className={cn(
                    'px-3 py-2.5 text-[13px]',
                    stale ? 'font-semibold text-amber-700' : 'text-ink-600',
                  )}
                >
                  {row.lastActivityAt ? formatDateTime(row.lastActivityAt) : '—'}
                </td>
                <td className="px-2 py-2.5" onClick={(event) => event.stopPropagation()}>
                  <div className="flex justify-end gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                    <RowIcon label="Add contact" icon={Plus} />
                    <RowIcon label="Add deal" icon={CheckSquare} />
                    <RowIcon label="Add task" icon={StickyNote} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RowIcon({ label, icon: Icon }: { label: string; icon: typeof Plus }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-soft hover:text-brand-700"
      onClick={() => undefined}
    >
      <Icon className="size-4" />
    </button>
  );
}

function SortHeader({
  col,
  label,
  sort,
  dir,
  onSort,
}: {
  col: NonNullable<CompanyListQuery['sort']>;
  label: string;
  sort: CompanyListQuery['sort'];
  dir: CompanyListQuery['dir'];
  onSort: (field: NonNullable<CompanyListQuery['sort']>) => void;
}) {
  const active = sort === col;
  return (
    <th className="px-3 py-2.5">
      <button
        type="button"
        className={cn('inline-flex items-center gap-1 font-semibold', active && 'text-brand-700')}
        onClick={() => onSort(col)}
      >
        {label}
        <ArrowUpDown className="size-3.5" />
      </button>
      {active ? <span className="sr-only">{dir}</span> : null}
    </th>
  );
}
