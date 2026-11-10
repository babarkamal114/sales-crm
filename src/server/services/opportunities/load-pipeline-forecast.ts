import 'server-only';

import { and, eq, gte, ilike, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import type { PipelineForecastView } from '@/domain/opportunities/forecast-view';
import type { ForecastQuery } from '@/domain/opportunities/forecast-query';
import { closeWindowLabel } from '@/domain/opportunities/forecast-query';
import { assertCanAccessPipeline } from '@/server/access/pipeline-access';
import { contact, opportunity, pipelineStage } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { closeDateRangeForWindow } from '@/server/services/opportunities/forecast-dates';
import { listPipelineStages } from '@/server/services/opportunities/opportunity-board';

function buildForecastFilter(
  session: TenantSession,
  pipelineId: string,
  query: ForecastQuery,
) {
  const conditions = [
    eq(opportunity.orgId, session.orgId),
    eq(opportunity.pipelineId, pipelineId),
    isNull(opportunity.deletedAt),
    eq(opportunity.status, 'open'),
  ];

  if (query.owner === 'me') {
    conditions.push(eq(opportunity.ownerId, session.userId));
  }

  const q = query.q?.trim();
  if (q) {
    conditions.push(
      or(
        ilike(opportunity.name, `%${q}%`),
        ilike(contact.displayName, `%${q}%`),
      )!,
    );
  }

  const range = closeDateRangeForWindow(query.close ?? 'all');
  if (range) {
    conditions.push(isNotNull(opportunity.expectedCloseDate));
    conditions.push(gte(opportunity.expectedCloseDate, range.from));
    conditions.push(lte(opportunity.expectedCloseDate, range.to));
  }

  return and(...conditions);
}

export async function loadPipelineForecast(
  tx: DbTransaction,
  session: TenantSession,
  pipelineId: string,
  query: ForecastQuery,
): Promise<PipelineForecastView> {
  await assertCanAccessPipeline(tx, session, pipelineId);

  const closeWindow = query.close ?? 'all';
  const where = buildForecastFilter(session, pipelineId, query);

  const [stages, summaryRows] = await Promise.all([
    listPipelineStages(tx, session, pipelineId),
    tx
      .select({
        stageId: opportunity.stageId,
        dealCount: sql<number>`count(*)::int`,
        totalValuePence: sql<number>`coalesce(sum(${opportunity.valuePence}), 0)::bigint`,
        weightedValuePence: sql<number>`coalesce(sum(
          (${opportunity.valuePence} * coalesce(${opportunity.probabilityOverride}, ${pipelineStage.probability}, 0) / 100)
        ), 0)::bigint`,
      })
      .from(opportunity)
      .innerJoin(pipelineStage, eq(opportunity.stageId, pipelineStage.id))
      .innerJoin(contact, eq(opportunity.contactId, contact.id))
      .where(where)
      .groupBy(opportunity.stageId),
  ]);

  const summaryByStage = new Map(
    summaryRows.map((row) => [
      row.stageId,
      {
        dealCount: row.dealCount,
        totalValuePence: Number(row.totalValuePence),
        weightedValuePence: Number(row.weightedValuePence),
      },
    ]),
  );

  const openStages = stages.filter((stage) => stage.kind === 'open');
  const stageRows = openStages.map((stage) => {
    const summary = summaryByStage.get(stage.id);
    return {
      stageId: stage.id,
      stageName: stage.name,
      position: stage.position,
      probability: stage.probability,
      dealCount: summary?.dealCount ?? 0,
      totalValuePence: summary?.totalValuePence ?? 0,
      weightedValuePence: summary?.weightedValuePence ?? 0,
    };
  });

  const totals = stageRows.reduce(
    (acc, row) => ({
      dealCount: acc.dealCount + row.dealCount,
      openValuePence: acc.openValuePence + row.totalValuePence,
      weightedValuePence: acc.weightedValuePence + row.weightedValuePence,
    }),
    { dealCount: 0, openValuePence: 0, weightedValuePence: 0 },
  );

  return {
    closeWindow,
    closeWindowLabel: closeWindowLabel(closeWindow),
    totals,
    stages: stageRows,
  };
}
