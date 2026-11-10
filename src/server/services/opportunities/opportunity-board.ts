import 'server-only';

import {
  and,
  asc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from 'drizzle-orm';
import { daysInStage, isRotting } from '@/domain/opportunities/rules';
import type {
  BoardStageSummary,
  OpportunityCardView,
  PipelineListItem,
  PipelineStageView,
} from '@/domain/opportunities/card-view';
import type { BoardFilters } from '@/domain/opportunities/filters';
import { assertCanAccessPipeline, visiblePipelineIds } from '@/server/access/pipeline-access';
import { loadCollaborationCountsByOpportunity } from '@/server/services/opportunities/opportunity-collaboration-counts';
import {
  company,
  contact,
  lostReason,
  opportunity,
  pipeline,
  pipelineStage,
  user,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

const PAGE_SIZE = 25;

function ownerColour(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 55% 42%)`;
}

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function buildOpportunityFilter(
  session: TenantSession,
  pipelineId: string,
  filters: BoardFilters,
) {
  const conditions = [
    eq(opportunity.orgId, session.orgId),
    eq(opportunity.pipelineId, pipelineId),
    isNull(opportunity.deletedAt),
  ];

  if (filters.status === 'all') {
    // no status constraint
  } else {
    conditions.push(eq(opportunity.status, filters.status ?? 'open'));
  }

  if (filters.owner === 'me') {
    conditions.push(eq(opportunity.ownerId, session.userId));
  }

  const q = filters.q?.trim();
  if (q) {
    conditions.push(
      or(
        ilike(opportunity.name, `%${q}%`),
        ilike(contact.displayName, `%${q}%`),
      )!,
    );
  }

  return and(...conditions);
}

export async function listAccessiblePipelines(
  tx: DbTransaction,
  session: TenantSession,
): Promise<PipelineListItem[]> {
  const ids = await visiblePipelineIds(tx, session);
  if (ids.length === 0) return [];

  const rows = await tx
    .select({
      id: pipeline.id,
      name: pipeline.name,
      isDefault: pipeline.isDefault,
      openDealCount: sql<number>`count(${opportunity.id}) filter (where ${opportunity.status} = 'open' and ${opportunity.deletedAt} is null)::int`,
    })
    .from(pipeline)
    .leftJoin(
      opportunity,
      and(
        eq(opportunity.pipelineId, pipeline.id),
        eq(opportunity.status, 'open'),
        isNull(opportunity.deletedAt),
      ),
    )
    .where(
      and(
        eq(pipeline.orgId, session.orgId),
        isNull(pipeline.archivedAt),
        inArray(pipeline.id, ids),
      ),
    )
    .groupBy(pipeline.id)
    .orderBy(asc(pipeline.position), asc(pipeline.name));

  return rows;
}

export async function listPipelineStages(
  tx: DbTransaction,
  session: TenantSession,
  pipelineId: string,
): Promise<PipelineStageView[]> {
  await assertCanAccessPipeline(tx, session, pipelineId);

  return tx
    .select({
      id: pipelineStage.id,
      name: pipelineStage.name,
      kind: pipelineStage.kind,
      position: pipelineStage.position,
      probability: pipelineStage.probability,
    })
    .from(pipelineStage)
    .where(
      and(
        eq(pipelineStage.orgId, session.orgId),
        eq(pipelineStage.pipelineId, pipelineId),
        isNull(pipelineStage.archivedAt),
      ),
    )
    .orderBy(asc(pipelineStage.position));
}

export async function loadBoardSummary(
  tx: DbTransaction,
  session: TenantSession,
  pipelineId: string,
  filters: BoardFilters,
): Promise<BoardStageSummary[]> {
  await assertCanAccessPipeline(tx, session, pipelineId);

  const where = buildOpportunityFilter(session, pipelineId, filters);

  const rows = await tx
    .select({
      stageId: opportunity.stageId,
      count: sql<number>`count(*)::int`,
      totalValuePence: sql<number>`coalesce(sum(${opportunity.valuePence}), 0)::bigint`,
      weightedValuePence: sql<number>`coalesce(sum(
        (${opportunity.valuePence} * coalesce(${opportunity.probabilityOverride}, ${pipelineStage.probability}, 0) / 100)
      ), 0)::bigint`,
    })
    .from(opportunity)
    .innerJoin(pipelineStage, eq(opportunity.stageId, pipelineStage.id))
    .innerJoin(contact, eq(opportunity.contactId, contact.id))
    .where(where)
    .groupBy(opportunity.stageId);

  return rows.map((row) => ({
    stageId: row.stageId,
    count: row.count,
    totalValuePence: Number(row.totalValuePence),
    weightedValuePence: Number(row.weightedValuePence),
  }));
}

export async function loadBoardTotals(
  tx: DbTransaction,
  session: TenantSession,
  pipelineId: string,
  filters: BoardFilters,
): Promise<{ openValuePence: number; weightedValuePence: number; dealCount: number }> {
  await assertCanAccessPipeline(tx, session, pipelineId);
  const where = buildOpportunityFilter(session, pipelineId, filters);

  const [row] = await tx
    .select({
      dealCount: sql<number>`count(*)::int`,
      openValuePence: sql<number>`coalesce(sum(${opportunity.valuePence}), 0)::bigint`,
      weightedValuePence: sql<number>`coalesce(sum(
        (${opportunity.valuePence} * coalesce(${opportunity.probabilityOverride}, ${pipelineStage.probability}, 0) / 100)
      ), 0)::bigint`,
    })
    .from(opportunity)
    .innerJoin(pipelineStage, eq(opportunity.stageId, pipelineStage.id))
    .innerJoin(contact, eq(opportunity.contactId, contact.id))
    .where(where);

  return {
    dealCount: row?.dealCount ?? 0,
    openValuePence: Number(row?.openValuePence ?? 0),
    weightedValuePence: Number(row?.weightedValuePence ?? 0),
  };
}

type Cursor = { position: string; id: string };

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeCursor(raw: string | null): Cursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Cursor;
    if (typeof parsed.id === 'string' && typeof parsed.position === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function listStageOpportunityCards(
  tx: DbTransaction,
  session: TenantSession,
  pipelineId: string,
  stageId: string,
  filters: BoardFilters,
  cursorRaw: string | null,
): Promise<{ items: OpportunityCardView[]; nextCursor: string | null }> {
  await assertCanAccessPipeline(tx, session, pipelineId);

  const cursor = decodeCursor(cursorRaw);
  const now = new Date();
  const timeZone = 'Europe/London';

  const [stage] = await tx
    .select()
    .from(pipelineStage)
    .where(
      and(
        eq(pipelineStage.id, stageId),
        eq(pipelineStage.pipelineId, pipelineId),
        eq(pipelineStage.orgId, session.orgId),
      ),
    )
    .limit(1);

  if (!stage) {
    return { items: [], nextCursor: null };
  }

  let where = and(
    buildOpportunityFilter(session, pipelineId, filters),
    eq(opportunity.stageId, stageId),
  );

  if (cursor) {
    where = and(
      where,
      or(
        gt(opportunity.position, cursor.position),
        and(eq(opportunity.position, cursor.position), gt(opportunity.id, cursor.id)),
      ),
    );
  }

  const rows = await tx
    .select({
      opportunity,
      contactName: contact.displayName,
      companyName: company.name,
      lostReasonName: lostReason.name,
      ownerName: user.fullName,
    })
    .from(opportunity)
    .innerJoin(contact, eq(opportunity.contactId, contact.id))
    .innerJoin(user, eq(opportunity.ownerId, user.id))
    .leftJoin(company, eq(opportunity.companyId, company.id))
    .leftJoin(lostReason, eq(opportunity.lostReasonId, lostReason.id))
    .where(where)
    .orderBy(asc(opportunity.position), asc(opportunity.id))
    .limit(PAGE_SIZE + 1);

  const slice = rows.slice(0, PAGE_SIZE);
  const collaborationCounts = await loadCollaborationCountsByOpportunity(
    tx,
    session.orgId,
    slice.map((row) => row.opportunity.id),
  );

  const items: OpportunityCardView[] = slice.map((row) => {
    const opp = row.opportunity;
    const displayName = row.ownerName?.trim() || 'User';
    const counts = collaborationCounts.get(opp.id) ?? {
      noteCount: 0,
      openTaskCount: 0,
    };

    const stageDays = daysInStage(
      {
        stageEnteredAt: opp.stageEnteredAt,
        lastActivityAt: opp.lastActivityAt,
      },
      now,
      timeZone,
    );
    const rotting = isRotting(
      {
        status: opp.status,
        stageEnteredAt: opp.stageEnteredAt,
        lastActivityAt: opp.lastActivityAt,
      },
      {
        kind: stage.kind,
        rottingDays: stage.rottingDays,
      },
      counts.openTaskCount > 0,
      now,
      timeZone,
    );

    return {
      id: opp.id,
      name: opp.name,
      contactId: opp.contactId,
      contactName: row.contactName,
      companyId: opp.companyId,
      companyName: row.companyName ?? null,
      valuePence: opp.valuePence,
      currency: opp.currency,
      owner: {
        id: opp.ownerId,
        initials: initials(displayName),
        colour: ownerColour(opp.ownerId),
      },
      source: opp.source,
      status: opp.status,
      wonAt: opp.wonAt?.toISOString() ?? null,
      lostAt: opp.lostAt?.toISOString() ?? null,
      lostReasonName: row.lostReasonName,
      daysInStage: stageDays,
      isRotting: rotting,
      nextTask: null,
      openTaskCount: counts.openTaskCount,
      noteCount: counts.noteCount,
      unreadMessages: false,
      contactDndCall: false,
      contactDndMessage: false,
      version: opp.version,
      position: opp.position,
    };
  });

  const next =
    rows.length > PAGE_SIZE
      ? encodeCursor({
          position: rows[PAGE_SIZE - 1]!.opportunity.position,
          id: rows[PAGE_SIZE - 1]!.opportunity.id,
        })
      : null;

  return { items, nextCursor: next };
}

export function summariseBoardHeader(
  stages: PipelineStageView[],
  summaries: BoardStageSummary[],
): Map<string, BoardStageSummary & { probability: number | null }> {
  const map = new Map<string, BoardStageSummary & { probability: number | null }>();
  for (const stage of stages) {
    const summary = summaries.find((item) => item.stageId === stage.id);
    map.set(stage.id, {
      stageId: stage.id,
      count: summary?.count ?? 0,
      totalValuePence: summary?.totalValuePence ?? 0,
      weightedValuePence: summary?.weightedValuePence ?? 0,
      probability: stage.probability,
    });
  }
  return map;
}

export { PAGE_SIZE as BOARD_PAGE_SIZE };
