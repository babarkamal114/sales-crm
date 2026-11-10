import 'server-only';

import { and, eq } from 'drizzle-orm';
import {
  canMoveToStage,
  statusForStage,
} from '@/domain/opportunities/rules';
import type { MoveOpportunityInput } from '@/domain/opportunities/schemas';
import { assertCan, NotFoundError } from '@/server/access/capabilities';
import { assertCanAccessPipeline } from '@/server/access/pipeline-access';
import { writeAudit } from '@/server/audit/write';
import {
  opportunity,
  opportunityStageHistory,
  pipelineStage,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { refreshCompanyStats } from '@/server/services/companies/refresh-company-stats';
import { syncLifecycleOnOpportunityStatusChange } from '@/server/services/opportunities/sync-lifecycle-on-close';

export async function moveOpportunity(
  tx: DbTransaction,
  session: TenantSession,
  input: MoveOpportunityInput,
): Promise<{
  id: string;
  version: number;
  contactId: string;
  companyId: string | null;
  pipelineId: string;
  previousStatus: string;
  nextStatus: string;
}> {
  assertCan(session, 'opportunity.move');

  const [deal] = await tx
    .select()
    .from(opportunity)
    .where(
      and(eq(opportunity.orgId, session.orgId), eq(opportunity.id, input.opportunityId)),
    )
    .limit(1);

  if (!deal) {
    throw new NotFoundError('Opportunity not found.');
  }

  await assertCanAccessPipeline(tx, session, deal.pipelineId);

  if (deal.version !== input.version) {
    const err = new Error('Version conflict.');
    (err as Error & { code: string }).code = 'CONFLICT';
    throw err;
  }

  const [targetStage] = await tx
    .select()
    .from(pipelineStage)
    .where(
      and(
        eq(pipelineStage.id, input.stageId),
        eq(pipelineStage.pipelineId, deal.pipelineId),
        eq(pipelineStage.orgId, session.orgId),
      ),
    )
    .limit(1);

  if (!targetStage) {
    throw new NotFoundError('Stage not found.');
  }

  const moveCheck = canMoveToStage(
    {
      pipelineId: deal.pipelineId,
      stageId: deal.stageId,
      status: deal.status,
    },
    {
      id: targetStage.id,
      pipelineId: targetStage.pipelineId,
      kind: targetStage.kind,
      probability: targetStage.probability,
      rottingDays: targetStage.rottingDays,
    },
    {
      lostReasonId: input.lostReasonId ?? null,
    },
  );

  if (!moveCheck.ok) {
    const err = new Error(moveCheck.code);
    (err as Error & { code: string }).code = moveCheck.code;
    throw err;
  }

  const now = new Date();
  const nextStatus = statusForStage(targetStage);
  const previousSeconds = Math.max(
    0,
    Math.floor((now.getTime() - deal.stageEnteredAt.getTime()) / 1000),
  );

  const [updated] = await tx
    .update(opportunity)
    .set({
      stageId: targetStage.id,
      position: input.position,
      status: nextStatus,
      version: deal.version + 1,
      stageEnteredAt: now,
      lastActivityAt: now,
      updatedAt: now,
      updatedBy: session.userId,
      ...(nextStatus === 'won'
        ? { wonAt: now, lostAt: null, lostReasonId: null, lostNote: null, closedBy: session.userId }
        : {}),
      ...(nextStatus === 'lost'
        ? {
            lostAt: now,
            wonAt: null,
            lostReasonId: input.lostReasonId ?? null,
            lostNote: input.lostNote ?? null,
            closedBy: session.userId,
          }
        : {}),
      ...(nextStatus === 'open'
        ? {
            wonAt: null,
            lostAt: null,
            lostReasonId: null,
            lostNote: null,
            closedBy: null,
          }
        : {}),
    })
    .where(and(eq(opportunity.id, deal.id), eq(opportunity.version, deal.version)))
    .returning({ id: opportunity.id, version: opportunity.version });

  if (!updated) {
    const err = new Error('Version conflict.');
    (err as Error & { code: string }).code = 'CONFLICT';
    throw err;
  }

  await tx.insert(opportunityStageHistory).values({
    orgId: session.orgId,
    opportunityId: deal.id,
    fromStageId: deal.stageId,
    toStageId: targetStage.id,
    movedBy: session.userId,
    movedAt: now,
    timeInPreviousStageSeconds: previousSeconds,
  });

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'opportunity.moved',
    entityType: 'opportunity',
    entityId: deal.id,
    changes: {
      stageId: { from: deal.stageId, to: targetStage.id },
      position: { to: input.position },
    },
  });

  if (deal.companyId) {
    await refreshCompanyStats(tx, session.orgId, deal.companyId);
  }

  await syncLifecycleOnOpportunityStatusChange(tx, session, {
    contactId: deal.contactId,
    companyId: deal.companyId,
    previousStatus: deal.status,
    nextStatus: nextStatus,
  });

  return {
    id: updated.id,
    version: updated.version,
    contactId: deal.contactId,
    companyId: deal.companyId,
    pipelineId: deal.pipelineId,
    previousStatus: deal.status,
    nextStatus,
  };
}
