'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { OpportunityListQuery } from '@/domain/opportunities/list-query';
import { listQueryActive } from '@/domain/opportunities/list-query';
import type { OpportunityListRow } from '@/domain/opportunities/list-view';
import { opportunitiesKeys } from '@/features/opportunities/query-keys';
import { formatOpportunityValue } from '@/features/opportunities/lib/format-money';
import { formatShortDate, formatDateTime } from '@/features/opportunities/lib/format-duration';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

async function fetchListPage(
  pipelineId: string,
  query: OpportunityListQuery,
  cursor?: string,
) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.owner) params.set('owner', query.owner);
  if (query.status) params.set('status', query.status);
  params.set('listSort', query.listSort ?? 'last_activity');
  params.set('listDir', query.listDir ?? 'desc');
  if (cursor) params.set('cursor', cursor);

  const response = await fetch(
    `/api/v1/pipelines/${pipelineId}/opportunities?${params.toString()}`,
  );
  if (!response.ok) throw new Error('Failed to load list');
  return response.json() as Promise<{
    items: OpportunityListRow[];
    nextCursor: string | null;
  }>;
}

export function OpportunitiesList({
  pipelineId,
  listQuery,
  onOpenDeal,
  onClearFilters,
}: {
  pipelineId: string;
  listQuery: OpportunityListQuery;
  onOpenDeal: (id: string) => void;
  onClearFilters: () => void;
}) {
  const query = useInfiniteQuery({
    queryKey: opportunitiesKeys.list(pipelineId, listQuery),
    queryFn: ({ pageParam }) =>
      fetchListPage(pipelineId, listQuery, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
  const filtersActive = listQueryActive(listQuery);

  if (query.isLoading) {
    return (
      <div className="rounded-xl2 border border-line/60 bg-white px-6 py-12 text-center text-[13px] font-medium text-ink-500">
        Loading opportunities…
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="rounded-xl2 border border-rose-200 bg-rose-50/80 px-6 py-10 text-center">
        <p className="text-[14px] font-bold text-rose-800">Could not load the list</p>
        <Button type="button" className="mt-3" variant="secondary" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (rows.length === 0 && !filtersActive) {
    return (
      <div className="rounded-xl2 border border-line/60 bg-white px-6 py-12 text-center shadow-panel">
        <p className="text-[17px] font-extrabold text-ink-900">No deals in this pipeline yet</p>
        <p className="mx-auto mt-2 max-w-md text-[13px] font-medium text-ink-500">
          Switch to Board view to add deals, or import leads from Getting started.
        </p>
      </div>
    );
  }

  if (rows.length === 0 && filtersActive) {
    return (
      <div className="rounded-xl2 border border-line/60 bg-white px-6 py-12 text-center shadow-panel">
        <p className="text-[17px] font-extrabold text-ink-900">No deals match these filters</p>
        <Button type="button" className="mt-4" variant="secondary" onClick={onClearFilters}>
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <TableContainer>
        <Table>
          <TableHeader>
            <tr>
              <TableHead scope="col">Deal</TableHead>
              <TableHead scope="col">Contact</TableHead>
              <TableHead scope="col">Stage</TableHead>
              <TableHead scope="col" className="text-right">
                Value
              </TableHead>
              <TableHead scope="col">Owner</TableHead>
              <TableHead scope="col">Last activity</TableHead>
              <TableHead scope="col">Status</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <ListRow key={row.id} row={row} onOpen={() => onOpenDeal(row.id)} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {query.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ListRow({ row, onOpen }: { row: OpportunityListRow; onOpen: () => void }) {
  const activityLabel = row.lastActivityAt
    ? formatDateTime(row.lastActivityAt)
    : formatShortDate(row.createdAt);

  return (
    <TableRow
      interactive
      className="cursor-pointer"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <TableCell>
        <p className="text-[13px] font-bold text-ink-900">{row.name}</p>
        {row.isRotting ? (
          <p className="mt-0.5 text-[11px] font-semibold text-amber-700">
            {row.daysInStage}d in stage · needs attention
          </p>
        ) : null}
      </TableCell>
      <TableCell className="text-[13px] font-medium text-ink-600">{row.contactName}</TableCell>
      <TableCell>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-[12px] font-bold text-ink-800',
          )}
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              row.stageKind === 'won'
                ? 'bg-mint-500'
                : row.stageKind === 'lost'
                  ? 'bg-rose-500'
                  : 'bg-brand-500',
            )}
            aria-hidden
          />
          {row.stageName}
        </span>
      </TableCell>
      <TableCell className="text-right text-[13px] font-bold text-ink-900 num">
        {formatOpportunityValue(row.valuePence, row.currency)}
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-ink-700">
          <span
            className="flex size-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: row.owner.colour }}
          >
            {row.owner.initials}
          </span>
          <span className="max-w-[120px] truncate">{row.owner.fullName}</span>
        </span>
      </TableCell>
      <TableCell className="text-[12px] font-medium text-ink-500 num">{activityLabel}</TableCell>
      <TableCell>
        {row.status === 'won' ? (
          <StatusPill status="Won" />
        ) : row.status === 'lost' ? (
          <StatusPill status="Lost" />
        ) : (
          <span className="text-[12px] font-semibold text-ink-500">Open</span>
        )}
      </TableCell>
    </TableRow>
  );
}
