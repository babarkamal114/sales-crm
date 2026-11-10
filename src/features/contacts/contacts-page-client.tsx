'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  DEFAULT_CONTACT_LIST_COLUMNS,
  parseColumnsParam,
  serializeColumnsParam,
  type ContactListColumnId,
} from '@/domain/contacts/list-columns';
import type { ContactListQuery } from '@/domain/contacts/list-query';
import type { ContactListSummary } from '@/domain/contacts/list-view';
import { ContactSheet } from '@/features/contacts/components/contact-sheet';
import { contactLeadTabHref } from '@/domain/contacts/lead-tabs';
import { ContactsBulkBar } from '@/features/contacts/components/contacts-bulk-bar';
import { ContactsListColumns } from '@/features/contacts/components/contacts-list-columns';
import { ContactsListFilters } from '@/features/contacts/components/contacts-list-filters';
import { ContactsSmartListTabs } from '@/features/contacts/components/contacts-smart-list-tabs';
import { ContactsTable } from '@/features/contacts/components/contacts-table';
import { SaveSmartListDialog } from '@/features/contacts/components/save-smart-list-dialog';
import { useCreateDialog } from '@/components/create-dialog';
import { useContactsKeyboard } from '@/features/contacts/hooks/use-contacts-keyboard';
import { useDebouncedUrlParam } from '@/features/contacts/hooks/use-debounced-url-param';
import { buildContactsSearchParams } from '@/features/contacts/lib/build-contacts-search-params';
import { ContentPanel } from '@/components/layouts/app-header';
import { Button } from '@/components/ui/button';
import { qk } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

const BUILTIN_LISTS = [
  { id: 'all', label: 'All contacts' },
  { id: 'mine', label: 'My contacts' },
  { id: 'new_week', label: 'New this week' },
  { id: 'no_next_step', label: 'No next step' },
  { id: 'dnd', label: 'Do not contact' },
] as const;

const COLUMNS_STORAGE_KEY = 'crm.contacts.list.columns';

type SmartListApiItem = {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  sort: Record<string, unknown>;
  columns: unknown[];
  isShared: boolean;
  canDelete: boolean;
  canEdit: boolean;
};

async function fetchContacts(
  query: ContactListQuery,
  cursor?: string,
  scenario?: string,
) {
  const params = buildContactsSearchParams(
    query,
    cursor ? { cursor, ...(scenario ? { scenario } : {}) } : scenario ? { scenario } : undefined,
  );
  const response = await fetch(`/api/v1/contacts?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to load contacts');
  return response.json() as Promise<{
    summary: ContactListSummary;
    rows: import('@/domain/contacts/list-view').ContactListRow[];
    nextCursor: string | null;
  }>;
}

async function fetchMatchingContactIds(query: ContactListQuery): Promise<string[]> {
  const params = buildContactsSearchParams(query, { limit: 500 });
  const response = await fetch(`/api/v1/contacts/ids?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to resolve matching contacts');
  const data = (await response.json()) as { ids: string[] };
  return data.ids;
}

async function fetchSmartLists(): Promise<SmartListApiItem[]> {
  const response = await fetch('/api/v1/smart-lists');
  if (!response.ok) return [];
  const data = (await response.json()) as { items: SmartListApiItem[] };
  return data.items;
}

export function ContactsPageClient({ role, userId }: { role: string; userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contactId = searchParams.get('contact');
  const savedListId = searchParams.get('saved');
  const devScenario = searchParams.get('scenario') ?? undefined;
  const { openCreate } = useCreateDialog();
  const [saveListOpen, setSaveListOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);
  const [visibleColumns, setVisibleColumns] = useState<ContactListColumnId[]>(
    DEFAULT_CONTACT_LIST_COLUMNS,
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleColumns(parseColumnsParam(localStorage.getItem(COLUMNS_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    localStorage.setItem(COLUMNS_STORAGE_KEY, serializeColumnsParam(visibleColumns));
  }, [visibleColumns]);

  const listQuery: ContactListQuery = useMemo(
    () => ({
      q: searchParams.get('q') || undefined,
      list: (searchParams.get('list') as ContactListQuery['list']) || 'all',
      owner: (searchParams.get('owner') as ContactListQuery['owner']) || 'all',
      lifecycle: (searchParams.get('lifecycle') as ContactListQuery['lifecycle']) || undefined,
      tagId: searchParams.get('tagId') || undefined,
      source: searchParams.get('source') || undefined,
      sort: (searchParams.get('sort') as ContactListQuery['sort']) || 'last_activity',
      dir: (searchParams.get('dir') as ContactListQuery['dir']) || 'desc',
      limit: 50,
    }),
    [searchParams],
  );

  const { data: savedLists, refetch: refetchLists } = useQuery({
    queryKey: ['smart-lists'],
    queryFn: fetchSmartLists,
  });

  const { data, fetchNextPage, hasNextPage, isLoading, isError, refetch, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: qk.contacts.list({
        ...listQuery,
        savedListId: savedListId ?? null,
        devScenario: devScenario ?? null,
      }),
      queryFn: ({ pageParam }) =>
        fetchContacts(listQuery, pageParam as string | undefined, devScenario),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

  const summary = data?.pages[0]?.summary;
  const rows = data?.pages.flatMap((page) => page.rows) ?? [];

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      router.replace(`/contacts?${params.toString()}`, { scroll: false });
      setSelected(new Set());
      setSelectAllMatching(false);
    },
    [router, searchParams],
  );

  const commitSearch = useCallback(
    (value: string | null) => updateParams({ q: value }),
    [updateParams],
  );

  const { draft: searchDraft, setDraft: setSearchDraft } = useDebouncedUrlParam(
    listQuery.q,
    commitSearch,
    200,
  );

  const hasActiveFilters =
    Boolean(listQuery.q) ||
    listQuery.list !== 'all' ||
    listQuery.owner !== 'all' ||
    Boolean(listQuery.lifecycle) ||
    Boolean(listQuery.tagId) ||
    Boolean(listQuery.source) ||
    Boolean(savedListId);

  const emptyKind =
    !isLoading && summary?.total === 0
      ? hasActiveFilters
        ? 'filtered'
        : 'org'
      : 'none';

  const selectAllOnPage =
    rows.length > 0 && rows.every((row) => selected.has(row.id)) && !selectAllMatching;

  const handleAddContact = useCallback(() => {
    openCreate('contact', {}, {
      onCreated: (ref) => {
        void refetch();
        updateParams({ contact: ref.id });
      },
    });
  }, [openCreate, refetch, updateParams]);

  useContactsKeyboard({
    rowCount: rows.length,
    focusedRowIndex,
    setFocusedRowIndex,
    onFocusSearch: () => searchRef.current?.focus(),
    onAddContact: handleAddContact,
    onOpenRow: (index) => {
      const row = rows[index];
      if (row) updateParams({ contact: row.id });
    },
    onToggleSelectRow: (index) => {
      const row = rows[index];
      if (!row) return;
      setSelectAllMatching(false);
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(row.id)) next.delete(row.id);
        else next.add(row.id);
        return next;
      });
    },
  });

  useEffect(() => {
    const row = document.querySelector<HTMLElement>(
      `[data-contact-row][tabindex="0"]`,
    );
    row?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: 'nearest' });
  }, [focusedRowIndex, rows.length]);

  useEffect(() => {
    setFocusedRowIndex(0);
  }, [listQuery.list, listQuery.q, listQuery.sort, listQuery.lifecycle, listQuery.tagId]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '160px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const applySavedList = (item: SmartListApiItem) => {
    const filters = item.filters as {
      list?: ContactListQuery['list'];
      owner?: ContactListQuery['owner'];
      q?: string;
      lifecycle?: ContactListQuery['lifecycle'];
      tagId?: string;
      source?: string;
    };
    const sort = item.sort as { field?: ContactListQuery['sort']; dir?: ContactListQuery['dir'] };
    updateParams({
      saved: item.id,
      list: filters.list && filters.list !== 'all' ? filters.list : null,
      owner: filters.owner && filters.owner !== 'all' ? filters.owner : null,
      q: filters.q?.trim() ? filters.q.trim() : null,
      lifecycle: filters.lifecycle ?? null,
      tagId: filters.tagId ?? null,
      source: filters.source ?? null,
      sort: sort.field ?? null,
      dir: sort.dir ?? null,
    });
  };

  const toggleSort = (field: NonNullable<ContactListQuery['sort']>) => {
    if (listQuery.sort === field) {
      updateParams({ dir: listQuery.dir === 'asc' ? 'desc' : 'asc' });
      return;
    }
    updateParams({
      sort: field,
      dir: field === 'name' || field === 'company' || field === 'owner' ? 'asc' : 'desc',
    });
  };

  const clearAllFilters = () =>
    updateParams({
      q: null,
      list: null,
      owner: null,
      lifecycle: null,
      tagId: null,
      source: null,
      saved: null,
    });

  const selectAllMatchingAction = async () => {
    const ids = await fetchMatchingContactIds(listQuery);
    setSelected(new Set(ids));
    setSelectAllMatching(true);
  };

  const bulkSelectedIds = [...selected];
  const canDelete = role === 'admin' || role === 'manager';

  return (
    <ContentPanel className="flex min-h-0 flex-col gap-3.5 pb-28">
      <header className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900">Contacts</h1>
          <p className="mt-0.5 text-[13px] font-medium text-ink-500">
            {summary ? (
              <>
                <span className="num font-bold text-ink-800">{summary.total.toLocaleString()}</span>{' '}
                leads ·{' '}
                <span className="num">{summary.addedThisWeek}</span> added this week
              </>
            ) : (
              'Loading…'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" asChild>
            <a href="/contacts/import">Import</a>
          </Button>
          <Button type="button" onClick={handleAddContact}>
            Add contact
          </Button>
        </div>
      </header>

      {devScenario ? (
        <p
          className="rounded-xl border border-brand-200 bg-brand-50/80 px-3 py-2 text-[12px] font-medium text-brand-900"
          role="status"
        >
          Dev preview: list data from fixture <code className="font-mono">{devScenario}</code> — add
          contacts or remove <code className="font-mono">?scenario=</code> to use the database.
        </p>
      ) : null}

      <div
        className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-0.5"
        role="tablist"
        aria-label="Smart lists"
      >
        {BUILTIN_LISTS.map((item) => {
          const active = !savedListId && listQuery.list === item.id;
          const count = summary?.smartListCounts[item.id];
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[13px] font-semibold transition-colors',
                active
                  ? 'border border-line bg-white text-ink-900 shadow-sm'
                  : 'text-ink-500 hover:bg-white/60 hover:text-ink-900',
              )}
              onClick={() =>
                updateParams({
                  list: item.id === 'all' ? null : item.id,
                  saved: null,
                })
              }
            >
              {item.label}
              {count != null ? (
                <span
                  className={cn(
                    'num rounded-full px-1.5 py-0.5 text-[11px] font-bold',
                    active ? 'bg-brand-50 text-brand-700' : 'bg-soft text-ink-500',
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
        <ContactsSmartListTabs
          savedLists={(savedLists ?? []).map((item) => ({
            id: item.id,
            name: item.name,
            isShared: item.isShared,
            canDelete: item.canDelete,
            canEdit: item.canEdit,
            filters: item.filters,
            sort: item.sort,
            columns: item.columns ?? [],
          }))}
          activeSavedId={savedListId}
          onSelectSaved={(id) => {
            const item = savedLists?.find((row) => row.id === id);
            if (item) applySavedList(item);
          }}
          onReordered={() => void refetchLists()}
          canShareTeamLists={canDelete}
        />
        <button
          type="button"
          className="inline-flex h-9 shrink-0 items-center rounded-xl px-3 text-[13px] font-semibold text-brand-600 hover:bg-white/60"
          onClick={() => setSaveListOpen(true)}
        >
          Save view
        </button>
      </div>

      <section className="min-h-0 flex-1 overflow-hidden rounded-xl2 border border-line/70 bg-panel shadow-panel backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <label className="flex h-[38px] w-full max-w-[300px] items-center gap-2 rounded-xl border border-line bg-white px-3">
            <span className="sr-only">Search contacts</span>
            <input
              ref={searchRef}
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium text-ink-900 outline-none placeholder:text-ink-400"
              placeholder="Search name, email, phone, company… (/ to focus)"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
            />
          </label>
          <ContactsListFilters query={listQuery} onChange={updateParams} />
          <ContactsListColumns visible={visibleColumns} onChange={setVisibleColumns} />
          {hasActiveFilters ? (
            <Button type="button" variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear all
            </Button>
          ) : null}
          <p className="ml-auto text-[13px] font-medium text-ink-500" aria-live="polite">
            {summary && summary.total > 10000 ? (
              <span className="num font-bold text-ink-900">10,000+</span>
            ) : (
              <>
                <span className="num font-bold text-ink-900">
                  {(summary?.total ?? rows.length).toLocaleString()}
                </span>{' '}
                results
              </>
            )}
            {rows.length > 0 && summary && summary.total > rows.length ? (
              <>
                {' '}
                · <span className="num">{rows.length}</span> loaded
              </>
            ) : null}
          </p>
        </div>

        {selected.size > 0 ? (
          <>
            {selectAllMatching ? (
              <p className="border-b border-brand-100 bg-brand-50/60 px-4 py-2 text-[12px] font-semibold text-brand-800">
                All matching contacts selected ({selected.size}
                {summary && selected.size >= 500 ? ', max 500' : ''}).
              </p>
            ) : summary &&
              summary.total > rows.length &&
              selectAllOnPage ? (
              <p className="border-b border-line bg-soft/50 px-4 py-2 text-[12px] font-medium text-ink-700">
                All {rows.length} on this page are selected.{' '}
                <button
                  type="button"
                  className="font-semibold text-brand-600 underline"
                  onClick={() => void selectAllMatchingAction()}
                >
                  Select all matching ({summary.total.toLocaleString()})
                </button>
              </p>
            ) : null}
            <ContactsBulkBar
              selectedIds={bulkSelectedIds}
              canDelete={canDelete}
              canChangeOwner={canDelete}
              onClear={() => {
                setSelected(new Set());
                setSelectAllMatching(false);
              }}
              onComplete={() => void refetch()}
              onSendEmail={() => {
                const first = bulkSelectedIds[0];
                if (!first) return;
                const bulk =
                  bulkSelectedIds.length > 1
                    ? `?bulk=${encodeURIComponent(bulkSelectedIds.join(','))}`
                    : '';
                router.push(`${contactLeadTabHref(first, 'email')}${bulk}`);
              }}
            />
          </>
        ) : null}

        <ContactsTable
          rows={rows}
          loading={isLoading}
          error={isError}
          emptyKind={emptyKind}
          activeContactId={contactId}
          selected={selected}
          selectAllPage={selectAllOnPage}
          onSelectAllPage={(checked) => {
            if (checked) {
              setSelected(new Set(rows.map((row) => row.id)));
              setSelectAllMatching(false);
            } else {
              setSelected(new Set());
              setSelectAllMatching(false);
            }
          }}
          focusedRowIndex={focusedRowIndex}
          visibleColumns={visibleColumns}
          sort={listQuery.sort}
          dir={listQuery.dir}
          onSort={toggleSort}
          onToggleSelect={(id) => {
            setSelectAllMatching(false);
            setSelected((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onOpenContact={(id) => updateParams({ contact: id })}
          onRetry={() => void refetch()}
          onClearFilters={clearAllFilters}
        />

        <div ref={loadMoreRef} className="border-t border-line px-4 py-3">
          {isFetchingNextPage ? (
            <p className="text-[13px] font-medium text-ink-500">Loading more…</p>
          ) : hasNextPage ? (
            <Button type="button" variant="secondary" size="sm" onClick={() => void fetchNextPage()}>
              Load more
            </Button>
          ) : rows.length > 0 ? (
            <p className="text-[12px] font-medium text-ink-400">End of list</p>
          ) : null}
        </div>
      </section>

      <p className="text-[12px] font-medium text-ink-400">
        Shortcuts: <kbd className="rounded bg-soft px-1">/</kbd> search ·{' '}
        <kbd className="rounded bg-soft px-1">N</kbd> new contact · arrow keys ·{' '}
        <kbd className="rounded bg-soft px-1">Space</kbd> select ·{' '}
        <kbd className="rounded bg-soft px-1">Enter</kbd> open quick view
      </p>

      <SaveSmartListDialog
        open={saveListOpen}
        onOpenChange={setSaveListOpen}
        query={listQuery}
        canShare={canDelete}
        onSaved={() => void refetchLists()}
      />

      <ContactSheet
        contactId={contactId}
        currentUserId={userId}
        open={Boolean(contactId)}
        orderedContactIds={rows.map((row) => row.id)}
        onOpenChange={(open) => {
          if (!open) updateParams({ contact: null });
        }}
        onAfterClose={(id) => {
          if (!id) return;
          const row = document.querySelector<HTMLElement>(`tr[data-contact-id="${id}"]`);
          row?.focus({ preventScroll: true });
        }}
        onNavigateContact={(id) => updateParams({ contact: id })}
        onOpenDeal={(dealId) => router.push(`/opportunities?deal=${dealId}`)}
      />
    </ContentPanel>
  );
}
