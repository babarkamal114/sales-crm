import 'server-only';

import {
  and,
  asc,
  desc,
  eq,
  gt,
  lt,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { daysInStage, isRotting } from '@/domain/opportunities/rules';
import type { OpportunityListRow } from '@/domain/opportunities/list-view';
import type { OpportunityListQuery } from '@/domain/opportunities/list-query';
import { assertCanAccessPipeline } from '@/server/access/pipeline-access';
import { contact, opportunity, pipelineStage, user } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { buildOpportunityFilter } from '@/server/services/opportunities/opportunity-board';
import {
  decodeListCursor,
  encodeListCursor,
  type OpportunityListCursor,
} from '@/server/services/opportunities/list-cursor';

const TIME_ZONE = 'Europe/London';

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

const lastActivityKey = sql<Date>`coalesce(${opportunity.lastActivityAt}, ${opportunity.createdAt})`;

function cursorPredicate(
  cursor: OpportunityListCursor,
  field: OpportunityListQuery['listSort'],
  dir: OpportunityListQuery['listDir'],
): SQL | undefined {
  const isDesc = dir === 'desc';

  if (field === 'last_activity') {
    const k1 = new Date(String(cursor.k1));
    return isDesc
      ? or(
          lt(lastActivityKey, k1),
          and(eq(lastActivityKey, k1), gt(opportunity.id, cursor.id)),
        )
      : or(
          gt(lastActivityKey, k1),
          and(eq(lastActivityKey, k1), gt(opportunity.id, cursor.id)),
        );
  }

  if (field === 'value') {
    const k1 = Number(cursor.k1);
    return isDesc
      ? or(
          lt(opportunity.valuePence, k1),
          and(eq(opportunity.valuePence, k1), gt(opportunity.id, cursor.id)),
        )
      : or(
          gt(opportunity.valuePence, k1),
          and(eq(opportunity.valuePence, k1), gt(opportunity.id, cursor.id)),
        );
  }

  if (field === 'created') {
    const k1 = new Date(String(cursor.k1));
    return isDesc
      ? or(
          lt(opportunity.createdAt, k1),
          and(eq(opportunity.createdAt, k1), gt(opportunity.id, cursor.id)),
        )
      : or(
          gt(opportunity.createdAt, k1),
          and(eq(opportunity.createdAt, k1), gt(opportunity.id, cursor.id)),
        );
  }

  if (field === 'name') {
    const k1 = String(cursor.k1);
    return isDesc
      ? or(
          lt(opportunity.name, k1),
          and(eq(opportunity.name, k1), gt(opportunity.id, cursor.id)),
        )
      : or(
          gt(opportunity.name, k1),
          and(eq(opportunity.name, k1), gt(opportunity.id, cursor.id)),
        );
  }

  if (field === 'stage') {
    const k1 = Number(cursor.k1);
    const k2 = String(cursor.k2 ?? '');
    return isDesc
      ? or(
          lt(pipelineStage.position, k1),
          and(
            eq(pipelineStage.position, k1),
            or(
              lt(opportunity.name, k2),
              and(eq(opportunity.name, k2), gt(opportunity.id, cursor.id)),
            ),
          ),
        )
      : or(
          gt(pipelineStage.position, k1),
          and(
            eq(pipelineStage.position, k1),
            or(
              gt(opportunity.name, k2),
              and(eq(opportunity.name, k2), gt(opportunity.id, cursor.id)),
            ),
          ),
        );
  }

  return undefined;
}

function orderByClause(field: OpportunityListQuery['listSort'], dir: OpportunityListQuery['listDir']) {
  const d = dir === 'desc' ? desc : asc;
  switch (field) {
    case 'value':
      return [d(opportunity.valuePence), asc(opportunity.id)];
    case 'created':
      return [d(opportunity.createdAt), asc(opportunity.id)];
    case 'name':
      return [d(opportunity.name), asc(opportunity.id)];
    case 'stage':
      return [d(pipelineStage.position), d(opportunity.name), asc(opportunity.id)];
    case 'last_activity':
    default:
      return [d(lastActivityKey), asc(opportunity.id)];
  }
}

function rowCursorKeys(
  field: OpportunityListQuery['listSort'],
  row: {
    id: string;
    name: string;
    valuePence: number | null;
    createdAt: Date;
    lastActivityAt: Date | null;
    stagePosition: number;
  },
): Pick<OpportunityListCursor, 'id' | 'k1' | 'k2'> {
  switch (field) {
    case 'value':
      return { id: row.id, k1: row.valuePence ?? 0 };
    case 'created':
      return { id: row.id, k1: row.createdAt.toISOString() };
    case 'name':
      return { id: row.id, k1: row.name };
    case 'stage':
      return { id: row.id, k1: row.stagePosition, k2: row.name };
    case 'last_activity':
    default:
      return { id: row.id, k1: (row.lastActivityAt ?? row.createdAt).toISOString() };
  }
}

export async function listPipelineOpportunities(
  tx: DbTransaction,
  session: TenantSession,
  pipelineId: string,
  query: OpportunityListQuery,
  cursorRaw: string | null,
): Promise<{ items: OpportunityListRow[]; nextCursor: string | null }> {
  await assertCanAccessPipeline(tx, session, pipelineId);

  const limit = query.limit ?? 25;
  const cursor = decodeListCursor(cursorRaw);
  const sortField = query.listSort ?? 'last_activity';
  const sortDir = query.listDir ?? 'desc';

  let where = buildOpportunityFilter(session, pipelineId, query);

  if (cursor && cursor.field === sortField) {
    const predicate = cursorPredicate({ ...cursor, dir: sortDir }, sortField, sortDir);
    if (predicate) where = and(where, predicate);
  }

  const now = new Date();
  const order = orderByClause(sortField, sortDir);

  const rows = await tx
    .select({
      opportunity,
      contactName: contact.displayName,
      stageName: pipelineStage.name,
      stageKind: pipelineStage.kind,
      stagePosition: pipelineStage.position,
      stageRottingDays: pipelineStage.rottingDays,
      ownerName: user.fullName,
    })
    .from(opportunity)
    .innerJoin(contact, eq(opportunity.contactId, contact.id))
    .innerJoin(pipelineStage, eq(opportunity.stageId, pipelineStage.id))
    .innerJoin(user, eq(opportunity.ownerId, user.id))
    .where(where)
    .orderBy(...order)
    .limit(limit + 1);

  const slice = rows.slice(0, limit);
  const items: OpportunityListRow[] = slice.map((row) => {
    const opp = row.opportunity;
    const ownerDisplay = row.ownerName?.trim() || 'User';
    const stageDays = daysInStage(
      {
        stageEnteredAt: opp.stageEnteredAt,
        lastActivityAt: opp.lastActivityAt,
      },
      now,
      TIME_ZONE,
    );
    const rotting = isRotting(
      {
        status: opp.status,
        stageEnteredAt: opp.stageEnteredAt,
        lastActivityAt: opp.lastActivityAt,
      },
      { kind: row.stageKind, rottingDays: row.stageRottingDays },
      false,
      now,
      TIME_ZONE,
    );

    return {
      id: opp.id,
      name: opp.name,
      contactName: row.contactName,
      stageName: row.stageName,
      stageKind: row.stageKind,
      valuePence: opp.valuePence,
      currency: opp.currency,
      owner: {
        id: opp.ownerId,
        fullName: ownerDisplay,
        initials: initials(ownerDisplay),
        colour: ownerColour(opp.ownerId),
      },
      status: opp.status,
      lastActivityAt: opp.lastActivityAt?.toISOString() ?? null,
      createdAt: opp.createdAt.toISOString(),
      daysInStage: stageDays,
      isRotting: rotting,
    };
  });

  const last = slice[slice.length - 1];
  const nextCursor =
    rows.length > limit && last
      ? encodeListCursor({
          ...rowCursorKeys(sortField, {
            id: last.opportunity.id,
            name: last.opportunity.name,
            valuePence: last.opportunity.valuePence,
            createdAt: last.opportunity.createdAt,
            lastActivityAt: last.opportunity.lastActivityAt,
            stagePosition: last.stagePosition,
          }),
          field: sortField,
          dir: sortDir,
        })
      : null;

  return { items, nextCursor };
}

/** Ordered ids for drawer J/K navigation when list sort matches the list view. */
export async function listOpportunityIdsForNavigation(
  tx: DbTransaction,
  session: TenantSession,
  pipelineId: string,
  query: OpportunityListQuery,
): Promise<string[]> {
  await assertCanAccessPipeline(tx, session, pipelineId);

  const sortField = query.listSort ?? 'last_activity';
  const sortDir = query.listDir ?? 'desc';
  const where = buildOpportunityFilter(session, pipelineId, query);
  const order = orderByClause(sortField, sortDir);

  const rows = await tx
    .select({ id: opportunity.id })
    .from(opportunity)
    .innerJoin(contact, eq(opportunity.contactId, contact.id))
    .innerJoin(pipelineStage, eq(opportunity.stageId, pipelineStage.id))
    .where(where)
    .orderBy(...order)
    .limit(2000);

  return rows.map((row) => row.id);
}
