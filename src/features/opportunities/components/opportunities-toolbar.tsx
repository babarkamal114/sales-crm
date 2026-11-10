'use client';

import { useEffect, useState } from 'react';
import type { BoardFilters } from '@/domain/opportunities/filters';
import { boardFiltersActive, boardSortSchema } from '@/domain/opportunities/filters';
import type { ForecastQuery } from '@/domain/opportunities/forecast-query';
import {
  forecastCloseWindowSchema,
  forecastQueryActive,
} from '@/domain/opportunities/forecast-query';
import type { OpportunityListQuery } from '@/domain/opportunities/list-query';
import { listQueryActive, listSortFieldSchema, listSortDirSchema } from '@/domain/opportunities/list-query';
import { SearchInput } from '@/components/ui/search-input';
import { formatOpportunityValue } from '@/features/opportunities/lib/format-money';

const LIST_SORT_LABELS: Record<(typeof listSortFieldSchema.options)[number], string> = {
  last_activity: 'Last activity',
  value: 'Value',
  created: 'Created',
  name: 'Deal name',
  stage: 'Stage',
};

const CLOSE_LABELS: Record<(typeof forecastCloseWindowSchema.options)[number], string> = {
  all: 'All open deals',
  '30d': 'Close in 30 days',
  '90d': 'Close in 90 days',
  month: 'Close this month',
};

export function OpportunitiesToolbar({
  view,
  filters,
  listQuery,
  forecastQuery,
  onFiltersChange,
  onListQueryChange,
  onForecastQueryChange,
  totals,
}: {
  view: 'board' | 'list' | 'forecast';
  filters: BoardFilters;
  listQuery: OpportunityListQuery;
  forecastQuery: ForecastQuery;
  onFiltersChange: (next: BoardFilters) => void;
  onListQueryChange: (next: OpportunityListQuery) => void;
  onForecastQueryChange: (next: ForecastQuery) => void;
  totals?: { openValuePence: number; weightedValuePence: number; dealCount: number };
}) {
  const [query, setQuery] = useState(
    filters.q ?? listQuery.q ?? forecastQuery.q ?? '',
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const q = query.trim() || undefined;
      if (view === 'list') {
        onListQueryChange({ ...listQuery, q });
      } else if (view === 'forecast') {
        onForecastQueryChange({ ...forecastQuery, q });
      } else {
        onFiltersChange({ ...filters, q });
      }
    }, 200);
    return () => window.clearTimeout(handle);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setQuery(filters.q ?? listQuery.q ?? forecastQuery.q ?? '');
  }, [filters.q, listQuery.q, forecastQuery.q]);

  const active =
    view === 'list'
      ? listQueryActive(listQuery)
      : view === 'forecast'
        ? forecastQueryActive(forecastQuery)
        : boardFiltersActive(filters);

  const owner =
    view === 'list'
      ? listQuery.owner
      : view === 'forecast'
        ? forecastQuery.owner
        : filters.owner;
  const status = view === 'list' ? listQuery.status : filters.status;

  return (
    <div className="flex flex-wrap items-center gap-2.5 lg:gap-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search opportunities…"
          className="h-[38px] w-full max-w-[280px] [&_input]:h-[38px] [&_input]:rounded-xl [&_input]:text-[13px]"
          aria-label="Search opportunities"
        />

        {view === 'board' ? (
          <select
            className="h-[38px] rounded-xl border border-ink-300/80 bg-white px-3 text-[12px] font-semibold text-ink-700"
            value={filters.sort ?? 'manual'}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                sort: event.target.value as BoardFilters['sort'],
              })
            }
            aria-label="Sort board"
          >
            {boardSortSchema.options.map((value) => (
              <option key={value} value={value}>
                Sort:{' '}
                {value === 'manual'
                  ? 'Manual'
                  : value === 'last_activity'
                    ? 'Last activity'
                    : value === 'value'
                      ? 'Value'
                      : 'Created'}
              </option>
            ))}
          </select>
        ) : null}

        {view === 'list' ? (
          <>
            <select
              className="h-[38px] rounded-xl border border-ink-300/80 bg-white px-3 text-[12px] font-semibold text-ink-700"
              value={listQuery.listSort ?? 'last_activity'}
              onChange={(event) =>
                onListQueryChange({
                  ...listQuery,
                  listSort: event.target.value as OpportunityListQuery['listSort'],
                })
              }
              aria-label="Sort list"
            >
              {listSortFieldSchema.options.map((value) => (
                <option key={value} value={value}>
                  Sort: {LIST_SORT_LABELS[value]}
                </option>
              ))}
            </select>
            <select
              className="h-[38px] rounded-xl border border-ink-300/80 bg-white px-3 text-[12px] font-semibold text-ink-700"
              value={listQuery.listDir ?? 'desc'}
              onChange={(event) =>
                onListQueryChange({
                  ...listQuery,
                  listDir: event.target.value as OpportunityListQuery['listDir'],
                })
              }
              aria-label="Sort direction"
            >
              {listSortDirSchema.options.map((value) => (
                <option key={value} value={value}>
                  {value === 'desc' ? 'Descending' : 'Ascending'}
                </option>
              ))}
            </select>
          </>
        ) : null}

        {view === 'forecast' ? (
          <select
            className="h-[38px] rounded-xl border border-ink-300/80 bg-white px-3 text-[12px] font-semibold text-ink-700"
            value={forecastQuery.close ?? 'all'}
            onChange={(event) =>
              onForecastQueryChange({
                ...forecastQuery,
                close: event.target.value as ForecastQuery['close'],
              })
            }
            aria-label="Expected close window"
          >
            {forecastCloseWindowSchema.options.map((value) => (
              <option key={value} value={value}>
                {CLOSE_LABELS[value]}
              </option>
            ))}
          </select>
        ) : null}

        <select
          className="h-[38px] rounded-xl border border-ink-300/80 bg-white px-3 text-[12px] font-semibold text-ink-700"
          value={owner ?? 'all'}
          onChange={(event) => {
            const nextOwner = event.target.value as BoardFilters['owner'];
            if (view === 'list') {
              onListQueryChange({ ...listQuery, owner: nextOwner });
            } else if (view === 'forecast') {
              onForecastQueryChange({ ...forecastQuery, owner: nextOwner });
            } else {
              onFiltersChange({ ...filters, owner: nextOwner });
            }
          }}
          aria-label="Filter by owner"
        >
          <option value="all">All owners</option>
          <option value="me">Me</option>
        </select>

        {view !== 'forecast' ? (
          <select
            className="h-[38px] rounded-xl border border-ink-300/80 bg-white px-3 text-[12px] font-semibold text-ink-700"
            value={status ?? 'open'}
            onChange={(event) => {
              const nextStatus = event.target.value as BoardFilters['status'];
              if (view === 'list') {
                onListQueryChange({ ...listQuery, status: nextStatus });
              } else {
                onFiltersChange({ ...filters, status: nextStatus });
              }
            }}
            aria-label="Filter by status"
          >
            <option value="open">Open deals</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
            <option value="all">All statuses</option>
          </select>
        ) : (
          <span className="inline-flex h-[38px] items-center rounded-xl bg-mint-50 px-3 text-[12px] font-bold text-mint-800">
            Open deals only
          </span>
        )}

        {active ? (
          <button
            type="button"
            className="text-[13px] font-semibold text-ink-500 transition-colors hover:text-ink-900"
            onClick={() => {
              if (view === 'list') {
                onListQueryChange({
                  ...listQuery,
                  q: undefined,
                  owner: 'all',
                  status: 'open',
                });
                setQuery('');
              } else if (view === 'forecast') {
                onForecastQueryChange({
                  ...forecastQuery,
                  q: undefined,
                  owner: 'all',
                  close: 'all',
                });
                setQuery('');
              } else {
                onFiltersChange({
                  q: undefined,
                  owner: 'all',
                  status: 'open',
                  sort: filters.sort ?? 'manual',
                });
                setQuery('');
              }
            }}
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {totals && view !== 'forecast' ? (
        <div
          className="ml-auto flex flex-wrap items-center gap-4 text-[13px] font-medium text-ink-500"
          aria-live="polite"
        >
          <span className="inline-flex items-center whitespace-nowrap">
            <span
              className="mr-1.5 inline-block size-2 rounded-full bg-mint-500 shadow-[0_0_0_3px_var(--color-mint-50)]"
              aria-hidden
            />
            Live
          </span>
          <span className="whitespace-nowrap">
            Open <b className="font-bold text-ink-900 num">{formatOpportunityValue(totals.openValuePence)}</b>
          </span>
          <span className="whitespace-nowrap">
            Weighted{' '}
            <b className="font-bold text-ink-900 num">
              {formatOpportunityValue(totals.weightedValuePence)}
            </b>
          </span>
          <span className="whitespace-nowrap">
            <b className="font-bold text-ink-900 num">{totals.dealCount}</b> deals
          </span>
        </div>
      ) : null}
    </div>
  );
}
