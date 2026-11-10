'use client';

import { useQuery } from '@tanstack/react-query';
import type { ForecastQuery } from '@/domain/opportunities/forecast-query';
import { forecastQueryActive } from '@/domain/opportunities/forecast-query';
import { opportunitiesKeys } from '@/features/opportunities/query-keys';
import { formatOpportunityValue } from '@/features/opportunities/lib/format-money';
import { Button } from '@/components/ui/button';
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

async function fetchForecast(pipelineId: string, query: ForecastQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.owner) params.set('owner', query.owner);
  if (query.close && query.close !== 'all') params.set('close', query.close);

  const response = await fetch(
    `/api/v1/pipelines/${pipelineId}/forecast?${params.toString()}`,
  );
  if (!response.ok) throw new Error('Failed to load forecast');
  return response.json() as Promise<{
    forecast: import('@/domain/opportunities/forecast-view').PipelineForecastView;
  }>;
}

export function OpportunitiesForecast({
  pipelineId,
  forecastQuery,
  onClearFilters,
  onOpenStage,
}: {
  pipelineId: string;
  forecastQuery: ForecastQuery;
  onClearFilters: () => void;
  onOpenStage: (stageId: string) => void;
}) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: opportunitiesKeys.forecast(pipelineId, forecastQuery),
    queryFn: () => fetchForecast(pipelineId, forecastQuery),
  });

  const forecast = data?.forecast;
  const maxValue = Math.max(1, ...(forecast?.stages.map((s) => s.totalValuePence) ?? [1]));
  const filtersActive = forecastQueryActive(forecastQuery);

  if (isLoading) {
    return (
      <div className="rounded-xl2 border border-line/60 bg-white px-6 py-12 text-center text-[13px] font-medium text-ink-500">
        Loading forecast…
      </div>
    );
  }

  if (isError || !forecast) {
    return (
      <div className="rounded-xl2 border border-rose-200 bg-rose-50/80 px-6 py-10 text-center">
        <p className="text-[14px] font-bold text-rose-800">Could not load forecast</p>
        <Button type="button" className="mt-3" variant="secondary" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (forecast.totals.dealCount === 0 && !filtersActive) {
    return (
      <div className="rounded-xl2 border border-line/60 bg-white px-6 py-12 text-center shadow-panel">
        <p className="text-[17px] font-extrabold text-ink-900">No open deals to forecast</p>
        <p className="mx-auto mt-2 max-w-md text-[13px] font-medium text-ink-500">
          Add opportunities on the board or widen your close-date window.
        </p>
      </div>
    );
  }

  if (forecast.totals.dealCount === 0 && filtersActive) {
    return (
      <div className="rounded-xl2 border border-line/60 bg-white px-6 py-12 text-center shadow-panel">
        <p className="text-[17px] font-extrabold text-ink-900">No deals match this forecast view</p>
        <Button type="button" className="mt-4" variant="secondary" onClick={onClearFilters}>
          Clear filters
        </Button>
      </div>
    );
  }

  const weightedShare =
    forecast.totals.openValuePence > 0
      ? Math.round(
          (forecast.totals.weightedValuePence / forecast.totals.openValuePence) * 100,
        )
      : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <ForecastKpi
          label="Open pipeline"
          value={formatOpportunityValue(forecast.totals.openValuePence)}
          hint={`${forecast.totals.dealCount} open deals · ${forecast.closeWindowLabel.toLowerCase()}`}
        />
        <ForecastKpi
          label="Weighted forecast"
          value={formatOpportunityValue(forecast.totals.weightedValuePence)}
          hint={`~${weightedShare}% of open value at stage probability`}
          accent="brand"
        />
        <ForecastKpi
          label="Coverage"
          value={`${forecast.stages.filter((s) => s.dealCount > 0).length} stages`}
          hint="Open stages with at least one deal"
        />
      </div>

      <div className="rounded-xl2 border border-line/60 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-[16px] font-extrabold text-ink-900">By stage</h2>
          <p className="mt-1 text-[12px] font-medium text-ink-500">
            Open deals weighted by stage probability
            {forecast.closeWindow !== 'all'
              ? ` · expected close ${forecast.closeWindowLabel.toLowerCase()}`
              : ''}
            .
          </p>
        </div>

        <TableContainer className="border-0 shadow-none">
          <Table>
            <TableHeader>
              <tr>
                <TableHead scope="col">Stage</TableHead>
                <TableHead scope="col">Likelihood</TableHead>
                <TableHead scope="col" className="text-right">
                  Deals
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Value
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Weighted
                </TableHead>
                <TableHead scope="col" className="min-w-[140px]">
                  Mix
                </TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {forecast.stages.map((stage) => (
                <TableRow
                  key={stage.stageId}
                  interactive={stage.dealCount > 0}
                  className={cn(stage.dealCount > 0 && 'cursor-pointer')}
                  onClick={() => {
                    if (stage.dealCount > 0) onOpenStage(stage.stageId);
                  }}
                  onKeyDown={(event) => {
                    if (stage.dealCount === 0) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onOpenStage(stage.stageId);
                    }
                  }}
                >
                  <TableCell>
                    <span className="text-[13px] font-bold text-ink-900">{stage.stageName}</span>
                  </TableCell>
                  <TableCell className="text-[12px] font-semibold text-ink-600">
                    {stage.probability != null ? `${stage.probability}%` : '—'}
                  </TableCell>
                  <TableCell className="text-right text-[13px] font-bold text-ink-900 num">
                    {stage.dealCount}
                  </TableCell>
                  <TableCell className="text-right text-[13px] font-bold text-ink-900 num">
                    {formatOpportunityValue(stage.totalValuePence)}
                  </TableCell>
                  <TableCell className="text-right text-[13px] font-bold text-brand-700 num">
                    {formatOpportunityValue(stage.weightedValuePence)}
                  </TableCell>
                  <TableCell>
                    <div className="h-2 rounded-full bg-soft">
                      <div
                        className="h-2 rounded-full bg-brand-500 transition-[width]"
                        style={{
                          width: `${Math.round((stage.totalValuePence / maxValue) * 100)}%`,
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}

function ForecastKpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: 'brand';
}) {
  return (
    <div className="rounded-xl2 border border-line/60 bg-white px-4 py-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{label}</p>
      <p
        className={cn(
          'mt-1 text-[22px] font-extrabold num',
          accent === 'brand' ? 'text-brand-700' : 'text-ink-900',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-[12px] font-medium text-ink-500">{hint}</p>
    </div>
  );
}
