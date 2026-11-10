'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { CompanyListQuery } from '@/domain/companies/list-query';
import type { CompanyBuiltinListId } from '@/features/companies/components/companies-smart-list-tabs';
import { useCreateDialog } from '@/components/create-dialog';
import { qk } from '@/lib/query-keys';
import { CompaniesBulkBar } from '@/features/companies/components/companies-bulk-bar';
import { CompaniesSmartListTabs } from '@/features/companies/components/companies-smart-list-tabs';
import { CompaniesTable } from '@/features/companies/components/companies-table';
import { CompanySheet } from '@/features/companies/components/company-sheet';
import { useContactsKeyboard } from '@/features/contacts/hooks/use-contacts-keyboard';
import { useDebouncedUrlParam } from '@/features/contacts/hooks/use-debounced-url-param';
import { ContentPanel } from '@/components/layouts/app-header';
import { Button } from '@/components/ui/button';

async function fetchCompanies(query: CompanyListQuery, cursor?: string) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.list && query.list !== 'all') params.set('list', query.list);
  if (query.sort) params.set('sort', query.sort);
  if (query.dir) params.set('dir', query.dir);
  if (cursor) params.set('cursor', cursor);
  params.set('limit', String(query.limit ?? 50));
  const response = await fetch(`/api/v1/companies?${params.toString()}`);
  if (!response.ok) throw new Error('Failed');
  return response.json() as Promise<{
    rows: import('@/domain/companies/list-view').CompanyListRow[];
    nextCursor: string | null;
    total: number;
    customerCount: number;
    listCounts: Record<string, number>;
  }>;
}

export function CompaniesPageClient({
  role,
  userId,
}: {
  role: string;
  userId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openCreate } = useCreateDialog();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const listQuery: CompanyListQuery = useMemo(
    () => ({
      q: searchParams.get('q') || undefined,
      list: (searchParams.get('list') as CompanyListQuery['list']) || 'all',
      sort: (searchParams.get('sort') as CompanyListQuery['sort']) || 'name',
      dir: (searchParams.get('dir') as CompanyListQuery['dir']) || 'asc',
      limit: 50,
    }),
    [searchParams],
  );

  const { data, fetchNextPage, hasNextPage, isLoading, isError, refetch, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: qk.companies.list(listQuery),
      queryFn: ({ pageParam }) => fetchCompanies(listQuery, pageParam as string | undefined),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    });

  const rows = data?.pages.flatMap((page) => page.rows) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const customerCount = data?.pages[0]?.customerCount ?? 0;
  const listCounts = data?.pages[0]?.listCounts ?? {};

  const companyIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const selectedIds = useMemo(() => [...selected], [selected]);
  const selectedRows = useMemo(
    () => rows.filter((row) => selected.has(row.id)).map((row) => ({
      id: row.id,
      name: row.name,
      domain: row.domain,
    })),
    [rows, selected],
  );
  const canDelete = role === 'admin' || role === 'manager';
  const canChangeOwner = canDelete;

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      router.replace(`/companies?${params.toString()}`, { scroll: false });
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

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: '120px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const toggleSort = (field: NonNullable<CompanyListQuery['sort']>) => {
    if (listQuery.sort === field) {
      updateParams({ dir: listQuery.dir === 'asc' ? 'desc' : 'asc' });
      return;
    }
    updateParams({
      sort: field,
      dir: field === 'name' ? 'asc' : 'desc',
    });
  };

  const openCompany = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('company', id);
      router.replace(`/companies?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddCompany = useCallback(() => {
    openCreate('company', {}, {
      onCreated: (ref) => {
        void refetch();
        openCompany(ref.id);
      },
    });
  }, [openCreate, openCompany, refetch]);

  useContactsKeyboard({
    onFocusSearch: () => searchRef.current?.focus(),
    onAddContact: handleAddCompany,
    onOpenRow: (index) => {
      const row = rows[index];
      if (row) openCompany(row.id);
    },
    onToggleSelectRow: (index) => {
      const row = rows[index];
      if (row) toggleSelect(row.id);
    },
    rowCount: rows.length,
    focusedRowIndex,
    setFocusedRowIndex,
  });

  const filteredEmpty = Boolean(listQuery.q || (listQuery.list && listQuery.list !== 'all'));

  return (
    <>
      <ContentPanel className="flex min-h-0 flex-col gap-4 pb-28">
        <header className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900">Companies</h1>
            <p className="mt-0.5 text-[13px] font-medium text-ink-500">
              <span className="num font-bold text-ink-800">{total.toLocaleString()}</span> companies ·{' '}
              <span className="num font-bold text-mint-700">{customerCount.toLocaleString()}</span>{' '}
              customers
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={() => router.push('/contacts/import')}>
            Import
          </Button>
          <Button type="button" onClick={handleAddCompany}>
            Add company
          </Button>
        </header>

        <CompaniesSmartListTabs
          active={listQuery.list ?? 'all'}
          counts={listCounts}
          onSelect={(id: CompanyBuiltinListId) => updateParams({ list: id === 'all' ? null : id })}
        />

        <section className="min-h-0 flex-1 overflow-hidden rounded-xl2 border border-line/70 bg-panel shadow-panel backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <label className="flex h-[38px] w-full max-w-[300px] items-center rounded-xl border border-line bg-white px-3">
              <span className="sr-only">Search companies</span>
              <input
                ref={searchRef}
                className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium outline-none"
                placeholder="Search name, domain, town, Companies House…"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
              />
            </label>
            <p className="ml-auto text-[13px] font-medium text-ink-500">
              Showing <span className="num font-bold text-ink-900">{rows.length}</span> of{' '}
              <span className="num font-bold text-ink-900">{total.toLocaleString()}</span>
            </p>
          </div>

          {selected.size > 0 ? (
            <CompaniesBulkBar
              selectedIds={selectedIds}
              selectedRows={selectedRows}
              canDelete={canDelete}
              canChangeOwner={canChangeOwner}
              onClear={() => setSelected(new Set())}
              onComplete={() => void refetch()}
            />
          ) : null}

          <CompaniesTable
            rows={rows}
            loading={isLoading}
            error={isError}
            sort={listQuery.sort}
            dir={listQuery.dir}
            selected={selected}
            focusedRowIndex={focusedRowIndex}
            onSort={toggleSort}
            onOpen={openCompany}
            onToggleSelect={toggleSelect}
            onRetry={() => void refetch()}
            filteredEmpty={filteredEmpty}
          />

          <div ref={loadMoreRef} className="border-t border-line px-4 py-3">
            {isFetchingNextPage ? (
              <p className="text-[13px] text-ink-500">Loading more…</p>
            ) : hasNextPage ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => void fetchNextPage()}>
                Load more
              </Button>
            ) : rows.length > 0 ? (
              <p className="text-[12px] text-ink-400">End of list</p>
            ) : null}
          </div>
        </section>

      </ContentPanel>

      <CompanySheet companyIds={companyIds} role={role} userId={userId} />
    </>
  );
}
