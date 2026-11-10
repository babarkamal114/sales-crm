import 'server-only';

import { alias } from 'drizzle-orm/pg-core';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import {
  daysInStage,
  effectiveProbability,
  isRotting,
  weightedValuePence,
} from '@/domain/opportunities/rules';
import type { OpportunityDetailView } from '@/domain/opportunities/detail-view';
import type { BoardFilters } from '@/domain/opportunities/filters';
import type { OpportunityListQuery } from '@/domain/opportunities/list-query';
import { assertCan, NotFoundError } from '@/server/access/capabilities';
import { assertCanAccessPipeline } from '@/server/access/pipeline-access';
import {
  contact,
  lostReason,
  opportunity,
  opportunityStageHistory,
  pipeline,
  pipelineStage,
  user,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { buildOpportunityFilter } from '@/server/services/opportunities/opportunity-board';
import { listOpportunityIdsForNavigation } from '@/server/services/opportunities/list-opportunities';
import { loadCollaborationCountsByOpportunity } from '@/server/services/opportunities/opportunity-collaboration-counts';
import { listOpportunityNotes } from '@/server/services/opportunities/opportunity-notes';
import {
  listOpportunityTasks,
  listOrgTeamMembers,
} from '@/server/services/opportunities/opportunity-tasks';

const NAV_CAP = 2000;
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

async function listBoardNavigationIds(
  tx: DbTransaction,
  session: TenantSession,
  pipelineId: string,
  filters: BoardFilters,
): Promise<string[]> {
  const rows = await tx
    .select({ id: opportunity.id })
    .from(opportunity)
    .innerJoin(pipelineStage, eq(opportunity.stageId, pipelineStage.id))
    .innerJoin(contact, eq(opportunity.contactId, contact.id))
    .where(buildOpportunityFilter(session, pipelineId, filters))
    .orderBy(asc(pipelineStage.position), asc(opportunity.position), asc(opportunity.id))
    .limit(NAV_CAP);

  return rows.map((row) => row.id);
}

export async function getOpportunityDetail(
  tx: DbTransaction,
  session: TenantSession,
  opportunityId: string,
  navFilters: BoardFilters,
  listNav?: OpportunityListQuery | null,
): Promise<OpportunityDetailView> {
  assertCan(session, 'opportunity.view');

  const fromStage = alias(pipelineStage, 'from_stage');
  const toStage = alias(pipelineStage, 'to_stage');
  const movedByUser = alias(user, 'moved_by_user');

  const [row] = await tx
    .select({
      opportunity,
      pipelineName: pipeline.name,
      stageName: pipelineStage.name,
      stageKind: pipelineStage.kind,
      stageProbability: pipelineStage.probability,
      stageRottingDays: pipelineStage.rottingDays,
      contactDisplayName: contact.displayName,
      contactEmail: contact.email,
      contactPhone: contact.phoneE164,
      ownerName: user.fullName,
      lostReasonName: lostReason.name,
    })
    .from(opportunity)
    .innerJoin(pipeline, eq(opportunity.pipelineId, pipeline.id))
    .innerJoin(pipelineStage, eq(opportunity.stageId, pipelineStage.id))
    .innerJoin(contact, eq(opportunity.contactId, contact.id))
    .innerJoin(user, eq(opportunity.ownerId, user.id))
    .leftJoin(lostReason, eq(opportunity.lostReasonId, lostReason.id))
    .where(
      and(
        eq(opportunity.orgId, session.orgId),
        eq(opportunity.id, opportunityId),
        isNull(opportunity.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError('Opportunity not found.');
  }

  const opp = row.opportunity;
  await assertCanAccessPipeline(tx, session, opp.pipelineId);

  const now = new Date();
  const stageDays = daysInStage(
    {
      stageEnteredAt: opp.stageEnteredAt,
      lastActivityAt: opp.lastActivityAt,
    },
    now,
    TIME_ZONE,
  );
  const [notes, tasks, teamMembers, counts] = await Promise.all([
    listOpportunityNotes(tx, session, opp.id),
    listOpportunityTasks(tx, session, opp.id),
    listOrgTeamMembers(tx, session.orgId),
    loadCollaborationCountsByOpportunity(tx, session.orgId, [opp.id]),
  ]);
  const collaboration = counts.get(opp.id) ?? { noteCount: 0, openTaskCount: 0 };

  const rotting = isRotting(
    {
      status: opp.status,
      stageEnteredAt: opp.stageEnteredAt,
      lastActivityAt: opp.lastActivityAt,
    },
    {
      kind: row.stageKind,
      rottingDays: row.stageRottingDays,
    },
    collaboration.openTaskCount > 0,
    now,
    TIME_ZONE,
  );

  const probabilityPercent = effectiveProbability(
    { probabilityOverride: opp.probabilityOverride },
    { kind: row.stageKind, probability: row.stageProbability },
  );

  const valuePence = opp.valuePence ?? 0;
  const weighted =
    opp.valuePence != null
      ? weightedValuePence(
          { valuePence, probabilityOverride: opp.probabilityOverride },
          { kind: row.stageKind, probability: row.stageProbability },
        )
      : 0;

  const ownerDisplay = row.ownerName?.trim() || 'User';

  const historyRows = await tx
    .select({
      id: opportunityStageHistory.id,
      movedAt: opportunityStageHistory.movedAt,
      fromStageName: fromStage.name,
      toStageName: toStage.name,
      movedByName: movedByUser.fullName,
      timeInPreviousStageSeconds: opportunityStageHistory.timeInPreviousStageSeconds,
    })
    .from(opportunityStageHistory)
    .innerJoin(toStage, eq(opportunityStageHistory.toStageId, toStage.id))
    .leftJoin(fromStage, eq(opportunityStageHistory.fromStageId, fromStage.id))
    .innerJoin(movedByUser, eq(opportunityStageHistory.movedBy, movedByUser.id))
    .where(
      and(
        eq(opportunityStageHistory.orgId, session.orgId),
        eq(opportunityStageHistory.opportunityId, opp.id),
      ),
    )
    .orderBy(desc(opportunityStageHistory.movedAt))
    .limit(50);

  const navIds = listNav?.listSort
    ? await listOpportunityIdsForNavigation(tx, session, opp.pipelineId, listNav)
    : await listBoardNavigationIds(tx, session, opp.pipelineId, navFilters);
  const index = navIds.indexOf(opp.id);

  return {
    id: opp.id,
    name: opp.name,
    pipelineId: opp.pipelineId,
    pipelineName: row.pipelineName,
    stage: {
      id: opp.stageId,
      name: row.stageName,
      kind: row.stageKind,
    },
    status: opp.status,
    valuePence: opp.valuePence,
    currency: opp.currency,
    weightedValuePence: weighted,
    probabilityPercent,
    expectedCloseDate: opp.expectedCloseDate ?? null,
    source: opp.source,
    campaign: opp.campaign,
    version: opp.version,
    contact: {
      id: opp.contactId,
      displayName: row.contactDisplayName,
      email: row.contactEmail,
      phoneE164: row.contactPhone,
    },
    owner: {
      id: opp.ownerId,
      fullName: ownerDisplay,
      initials: initials(ownerDisplay),
      colour: ownerColour(opp.ownerId),
    },
    wonAt: opp.wonAt?.toISOString() ?? null,
    lostAt: opp.lostAt?.toISOString() ?? null,
    lostReasonName: row.lostReasonName,
    lostNote: opp.lostNote,
    stageEnteredAt: opp.stageEnteredAt.toISOString(),
    lastActivityAt: opp.lastActivityAt?.toISOString() ?? null,
    daysInStage: stageDays,
    isRotting: rotting,
    createdAt: opp.createdAt.toISOString(),
    updatedAt: opp.updatedAt.toISOString(),
    openTaskCount: collaboration.openTaskCount,
    noteCount: collaboration.noteCount,
    navigation: {
      prevId: index > 0 ? (navIds[index - 1] ?? null) : null,
      nextId: index >= 0 && index < navIds.length - 1 ? (navIds[index + 1] ?? null) : null,
      index: index >= 0 ? index + 1 : 0,
      total: navIds.length,
    },
    activity: historyRows.map((item) => ({
      id: item.id,
      type: 'stage_change' as const,
      movedAt: item.movedAt.toISOString(),
      fromStageName: item.fromStageName,
      toStageName: item.toStageName,
      movedByName: item.movedByName?.trim() || 'User',
      timeInPreviousStageSeconds: item.timeInPreviousStageSeconds,
    })),
    notes,
    tasks,
    teamMembers,
  };
}
