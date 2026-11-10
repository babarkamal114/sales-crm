'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowUpDown, Check, Copy, Mail, MessageSquare, Phone } from 'lucide-react';
import type { ContactListColumnId } from '@/domain/contacts/list-columns';
import type { ContactListQuery } from '@/domain/contacts/list-query';
import type { ContactListRow } from '@/domain/contacts/list-view';
import { formatOpportunityValue } from '@/features/opportunities/lib/format-money';
import { formatDateTime } from '@/features/opportunities/lib/format-duration';
import { cn } from '@/lib/utils';

const TAG_CLASS: Record<string, string> = {
  t1: 'bg-brand-50 text-brand-700',
  t2: 'bg-purple-50 text-purple-700',
  t3: 'bg-teal-50 text-teal-800',
  t4: 'bg-amber-50 text-amber-800',
};

const SORTABLE: Partial<Record<ContactListColumnId, ContactListQuery['sort']>> = {
  name: 'name',
  company: 'company',
  owner: 'owner',
  last_activity: 'last_activity',
  created: 'created',
  open_deal: 'deal_value',
};

export function ContactsTable({
  rows,
  loading,
  error,
  emptyKind,
  activeContactId,
  selected,
  selectAllPage,
  onSelectAllPage,
  focusedRowIndex = -1,
  visibleColumns,
  sort,
  dir,
  onSort,
  onToggleSelect,
  onOpenContact,
  onRetry,
  onClearFilters,
}: {
  rows: ContactListRow[];
  loading: boolean;
  error: boolean;
  emptyKind: 'none' | 'filtered' | 'org';
  activeContactId: string | null;
  selected: Set<string>;
  selectAllPage: boolean;
  onSelectAllPage: (checked: boolean) => void;
  focusedRowIndex?: number;
  visibleColumns: ContactListColumnId[];
  sort: ContactListQuery['sort'];
  dir: ContactListQuery['dir'];
  onSort: (field: NonNullable<ContactListQuery['sort']>) => void;
  onToggleSelect: (id: string) => void;
  onOpenContact: (id: string) => void;
  onRetry: () => void;
  onClearFilters?: () => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 8,
  });

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-0 px-4 py-8">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="mb-2 h-12 animate-pulse rounded-lg bg-soft/80" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-[14px] font-bold text-rose-800">Could not load contacts</p>
        <button
          type="button"
          className="mt-2 text-[13px] font-semibold text-brand-600 underline"
          onClick={onRetry}
        >
          Retry
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        {emptyKind === 'org' ? (
          <>
            <h3 className="text-[17px] font-extrabold text-ink-900">No contacts yet</h3>
            <p className="mt-1 text-[13px] font-medium text-ink-500">
              Import a CSV or add your first contact to get started.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-[17px] font-extrabold text-ink-900">No contacts match</h3>
            <p className="mt-1 text-[13px] font-medium text-ink-500">
              Try clearing filters or broadening your search.
            </p>
            {onClearFilters ? (
              <button
                type="button"
                className="mt-3 text-[13px] font-semibold text-brand-600 underline"
                onClick={onClearFilters}
              >
                Clear filters
              </button>
            ) : null}
          </>
        )}
      </div>
    );
  }

  const show = (id: ContactListColumnId) => visibleColumns.includes(id);

  return (
    <div ref={parentRef} className="max-h-[min(62vh,720px)] overflow-auto">
      <table className="min-w-[1180px] w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-soft/95 backdrop-blur-sm">
          <tr className="text-left text-[12px] font-semibold text-ink-500">
            <th className="w-11 px-4 py-2.5" scope="col">
              <button
                type="button"
                className={cn(
                  'grid size-[18px] place-items-center rounded-md border border-line bg-white',
                  selectAllPage && 'border-brand-600 bg-brand-600 text-white',
                )}
                aria-checked={selectAllPage}
                role="checkbox"
                aria-label="Select all on page"
                onClick={() => onSelectAllPage(!selectAllPage)}
              >
                {selectAllPage ? <Check className="size-3" /> : null}
              </button>
            </th>
            {show('name') ? (
              <SortHeader col="name" label="Name" sort={sort} dir={dir} onSort={onSort} />
            ) : null}
            {show('phone') ? <th className="px-3 py-2.5">Phone</th> : null}
            {show('company') ? (
              <SortHeader col="company" label="Company" sort={sort} dir={dir} onSort={onSort} />
            ) : null}
            {show('open_deal') ? (
              <SortHeader col="open_deal" label="Open deal" sort={sort} dir={dir} onSort={onSort} />
            ) : null}
            {show('owner') ? (
              <SortHeader col="owner" label="Owner" sort={sort} dir={dir} onSort={onSort} />
            ) : null}
            {show('tags') ? <th className="px-3 py-2.5">Tags</th> : null}
            {show('source') ? <th className="px-3 py-2.5">Source</th> : null}
            {show('can_contact') ? <th className="px-3 py-2.5">Can contact</th> : null}
            {show('last_activity') ? (
              <SortHeader
                col="last_activity"
                label="Last activity"
                sort={sort}
                dir={dir}
                onSort={onSort}
              />
            ) : null}
            {show('created') ? (
              <SortHeader col="created" label="Created" sort={sort} dir={dir} onSort={onSort} />
            ) : null}
            <th className="w-20 px-3 py-2.5" scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {virtualizer.getVirtualItems().length > 0 && virtualizer.getVirtualItems()[0]!.start > 0 ? (
            <tr aria-hidden>
              <td
                colSpan={20}
                style={{ height: virtualizer.getVirtualItems()[0]!.start, padding: 0, border: 0 }}
              />
            </tr>
          ) : null}
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index]!;
            const active = activeContactId === row.id;
            const sel = selected.has(row.id);
            const focused = focusedRowIndex === virtualRow.index;

            return (
              <tr
                key={row.id}
                data-contact-row
                data-contact-id={row.id}
                tabIndex={focused ? 0 : -1}
                className={cn(
                  'group cursor-pointer border-b border-line/70 transition-colors outline-none',
                  active && 'bg-brand-50/80',
                  sel && !active && 'bg-brand-50/40',
                  focused && 'ring-2 ring-inset ring-brand-400',
                  'hover:bg-white',
                )}
                onClick={() => onOpenContact(row.id)}
                onKeyDown={(event) => {
                  if (event.key === ' ') {
                    event.preventDefault();
                    onToggleSelect(row.id);
                  }
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onOpenContact(row.id);
                  }
                }}
              >
                <td className="px-4 py-2.5" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    className={cn(
                      'grid size-[18px] place-items-center rounded-md border border-line bg-white',
                      sel && 'border-brand-600 bg-brand-600 text-white',
                    )}
                    aria-checked={sel}
                    role="checkbox"
                    onClick={() => onToggleSelect(row.id)}
                  >
                    {sel ? <Check className="size-3" /> : null}
                  </button>
                </td>
                {show('name') ? (
                  <td className="px-3 py-2.5">
                    <div className="flex min-w-[220px] items-center gap-2.5">
                      <span
                        className="grid size-8 place-items-center rounded-full bg-brand-600 text-[11px] font-bold text-white"
                        aria-hidden
                      >
                        {row.owner.initials}
                      </span>
                      <div className="min-w-0">
                        <b className="block truncate text-[14px] font-bold text-ink-900">
                          {row.displayName}
                        </b>
                        <small className="flex items-center gap-1 truncate text-[12px] text-ink-500">
                          {row.email ?? 'No email'}
                          {row.emailVerified ? (
                            <Check className="size-3 text-mint-700" aria-label="Verified" />
                          ) : null}
                        </small>
                      </div>
                    </div>
                  </td>
                ) : null}
                {show('phone') ? (
                  <td className="px-3 py-2.5 text-[13px] font-medium text-ink-700">
                    {row.phoneE164 ?? '—'}
                  </td>
                ) : null}
                {show('company') ? (
                  <td className="px-3 py-2.5 text-[13px] font-medium text-ink-700">
                    {row.companyName ?? '—'}
                  </td>
                ) : null}
                {show('open_deal') ? (
                  <td className="px-3 py-2.5 text-[13px]">
                    {row.openDeal ? (
                      <>
                        <b className="block font-semibold text-ink-900">{row.openDeal.name}</b>
                        <small className="text-ink-500">
                          {row.openDeal.stageName} ·{' '}
                          {formatOpportunityValue(row.openDeal.valuePence, 'GBP')}
                        </small>
                      </>
                    ) : (
                      <span className="text-ink-400">—</span>
                    )}
                  </td>
                ) : null}
                {show('owner') ? (
                  <td className="px-3 py-2.5 text-[13px] font-semibold text-ink-700">
                    {row.owner.fullName}
                  </td>
                ) : null}
                {show('tags') ? (
                  <td className="px-3 py-2.5">
                    <div className="flex max-w-[180px] flex-wrap gap-1">
                      {row.tags.length === 0 ? (
                        <span className="text-ink-400">—</span>
                      ) : (
                        row.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.id}
                            className={cn(
                              'rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                              TAG_CLASS[tag.colourKey] ?? 'bg-soft text-ink-600',
                            )}
                          >
                            {tag.name}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                ) : null}
                {show('source') ? (
                  <td className="px-3 py-2.5 text-[13px] text-ink-600">{row.source ?? '—'}</td>
                ) : null}
                {show('can_contact') ? (
                  <td className="px-3 py-2.5">
                    <ChannelIcons summary={row.canContact} />
                  </td>
                ) : null}
                {show('last_activity') ? (
                  <td
                    className={cn(
                      'px-3 py-2.5 text-[13px] font-medium',
                      row.isStaleActivity ? 'text-amber-700' : 'text-ink-600',
                    )}
                  >
                    {row.lastActivityAt ? formatDateTime(row.lastActivityAt) : '—'}
                  </td>
                ) : null}
                {show('created') ? (
                  <td className="px-3 py-2.5 text-[13px] text-ink-600">
                    {formatDateTime(row.createdAt)}
                  </td>
                ) : null}
                <td className="px-3 py-2.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                  <div className="flex gap-1" onClick={(event) => event.stopPropagation()}>
                    {row.email ? (
                      <button
                        type="button"
                        className="grid size-7 place-items-center rounded-lg bg-soft text-ink-600"
                        aria-label="Copy email"
                        onClick={() => void navigator.clipboard.writeText(row.email!)}
                      >
                        <Copy className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
          {virtualizer.getVirtualItems().length > 0 ? (
            <tr aria-hidden>
              <td
                colSpan={20}
                style={{
                  height:
                    virtualizer.getTotalSize() -
                    (virtualizer.getVirtualItems().at(-1)?.end ?? 0),
                  padding: 0,
                  border: 0,
                }}
              />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function SortHeader({
  col,
  label,
  sort,
  dir,
  onSort,
}: {
  col: ContactListColumnId;
  label: string;
  sort: ContactListQuery['sort'];
  dir: ContactListQuery['dir'];
  onSort: (field: NonNullable<ContactListQuery['sort']>) => void;
}) {
  const field = SORTABLE[col];
  if (!field) {
    return <th className="px-3 py-2.5">{label}</th>;
  }
  const active = sort === field;
  return (
    <th className="px-3 py-2.5" scope="col">
      <button
        type="button"
        className="inline-flex items-center gap-1 font-semibold text-ink-500 hover:text-ink-900"
        onClick={() => {
          if (active) {
            onSort(field);
            return;
          }
          onSort(field);
        }}
      >
        {label}
        <ArrowUpDown className={cn('size-3.5', active && 'text-brand-600')} aria-hidden />
        {active ? (
          <span className="sr-only">Sorted {dir === 'asc' ? 'ascending' : 'descending'}</span>
        ) : null}
      </button>
    </th>
  );
}

function ChannelIcons({ summary }: { summary: ContactListRow['canContact'] }) {
  const items = [
    { key: 'email', icon: Mail, allowed: summary.email.allowed },
    { key: 'sms', icon: MessageSquare, allowed: summary.sms.allowed },
    { key: 'call', icon: Phone, allowed: summary.call.allowed },
  ] as const;

  return (
    <span className="inline-flex gap-1">
      {items.map(({ key, icon: Icon, allowed }) => (
        <span
          key={key}
          className={cn(
            'grid size-6 place-items-center rounded-md bg-soft text-ink-500',
            !allowed && 'bg-rose-50 text-rose-700',
          )}
          title={allowed ? key : summary[key].reason}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
      ))}
    </span>
  );
}
