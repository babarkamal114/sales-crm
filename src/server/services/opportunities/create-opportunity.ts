import 'server-only';

import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { OpportunityPriority, OpportunityValueType } from '@/domain/opportunities/form-constants';
import { statusForStage } from '@/domain/opportunities/rules';
import {
  createOpportunitySchema,
  type CreateOpportunityInput,
} from '@/domain/opportunities/schemas';
import { assertCan, ForbiddenError, NotFoundError } from '@/server/access/capabilities';
import { assertCanAccessPipeline } from '@/server/access/pipeline-access';
import { writeAudit } from '@/server/audit/write';
import {
  company,
  contact,
  opportunity,
  opportunityFollower,
  opportunityNote,
  opportunityTag,
  opportunityTask,
  pipelineMember,
  pipelineStage,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { refreshCompanyStats } from '@/server/services/companies/refresh-company-stats';

async function assertOwnerOnPipeline(
  tx: DbTransaction,
  orgId: string,
  pipelineId: string,
  ownerId: string,
): Promise<void> {
  const [member] = await tx
    .select({ id: pipelineMember.id })
    .from(pipelineMember)
    .where(
      and(
        eq(pipelineMember.orgId, orgId),
        eq(pipelineMember.pipelineId, pipelineId),
        eq(pipelineMember.userId, ownerId),
      ),
    )
    .limit(1);
  if (!member) {
    throw new ForbiddenError('Owner must be assigned to this pipeline.');
  }
}

export async function createOpportunity(
  tx: DbTransaction,
  session: TenantSession,
  raw: CreateOpportunityInput,
): Promise<{
  id: string;
  contactId: string;
  companyId: string | null;
  pipelineId: string;
}> {
  const input = createOpportunitySchema.parse(raw);
  assertCan(session, 'opportunity.create');
  await assertCanAccessPipeline(tx, session, input.pipelineId);

  const opportunityId = input.id ?? randomUUID();

  const [existing] = await tx
    .select({ id: opportunity.id })
    .from(opportunity)
    .where(and(eq(opportunity.orgId, session.orgId), eq(opportunity.id, opportunityId)))
    .limit(1);

  if (existing) {
    const [row] = await tx
      .select({
        contactId: opportunity.contactId,
        companyId: opportunity.companyId,
        pipelineId: opportunity.pipelineId,
      })
      .from(opportunity)
      .where(eq(opportunity.id, existing.id))
      .limit(1);
    return {
      id: existing.id,
      contactId: row?.contactId ?? input.contactId,
      companyId: row?.companyId ?? null,
      pipelineId: row?.pipelineId ?? input.pipelineId,
    };
  }

  const [linkedContact] = await tx
    .select({ id: contact.id, companyId: contact.companyId })
    .from(contact)
    .where(and(eq(contact.orgId, session.orgId), eq(contact.id, input.contactId)))
    .limit(1);

  if (!linkedContact) {
    throw new NotFoundError('Contact not found.');
  }

  const [stage] = await tx
    .select()
    .from(pipelineStage)
    .where(
      and(
        eq(pipelineStage.id, input.stageId),
        eq(pipelineStage.pipelineId, input.pipelineId),
        eq(pipelineStage.orgId, session.orgId),
      ),
    )
    .limit(1);

  if (!stage) {
    throw new NotFoundError('Stage not found.');
  }

  const ownerId = input.ownerId ?? session.userId;
  await assertOwnerOnPipeline(tx, session.orgId, input.pipelineId, ownerId);

  let companyId = input.companyId ?? linkedContact.companyId ?? null;
  if (companyId) {
    const [co] = await tx
      .select({ id: company.id })
      .from(company)
      .where(and(eq(company.orgId, session.orgId), eq(company.id, companyId)))
      .limit(1);
    if (!co) companyId = linkedContact.companyId ?? null;
  }

  const now = new Date();
  const probabilityOverride =
    input.probabilityOverride !== undefined ? input.probabilityOverride : null;

  await tx.insert(opportunity).values({
    id: opportunityId,
    orgId: session.orgId,
    contactId: input.contactId,
    companyId,
    pipelineId: input.pipelineId,
    stageId: input.stageId,
    name: input.name,
    status: statusForStage(stage),
    valuePence: input.valuePence ?? null,
    valueType: (input.valueType ?? 'one_off') as OpportunityValueType,
    priority: (input.priority ?? 'normal') as OpportunityPriority,
    currency: input.currency ?? 'GBP',
    ownerId,
    expectedCloseDate: input.expectedCloseDate ?? null,
    probabilityOverride,
    source: input.source ?? null,
    campaign: input.campaign ?? null,
    position: 'n',
    stageEnteredAt: now,
    lastActivityAt: now,
    createdBy: session.userId,
    updatedBy: session.userId,
    createdAt: now,
    updatedAt: now,
  });

  for (const tagId of input.tagIds ?? []) {
    await tx.insert(opportunityTag).values({
      opportunityId,
      tagId,
      orgId: session.orgId,
    });
  }

  for (const userId of input.followerIds ?? []) {
    await tx.insert(opportunityFollower).values({
      orgId: session.orgId,
      opportunityId,
      userId,
      createdBy: session.userId,
    });
  }

  if (input.description) {
    await tx.insert(opportunityNote).values({
      orgId: session.orgId,
      contactId: input.contactId,
      opportunityId,
      body: input.description,
      createdBy: session.userId,
      updatedBy: session.userId,
      createdAt: now,
      updatedAt: now,
    });
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'opportunity.created',
    entityType: 'opportunity',
    entityId: opportunityId,
    changes: { name: { to: input.name }, stageId: { to: input.stageId } },
  });

  if (input.nextTaskTitle) {
    const assigneeId = input.nextTaskAssigneeId ?? ownerId;
    await assertOwnerOnPipeline(tx, session.orgId, input.pipelineId, assigneeId);
    await tx.insert(opportunityTask).values({
      orgId: session.orgId,
      contactId: input.contactId,
      opportunityId,
      title: input.nextTaskTitle,
      assigneeId,
      dueAt: input.nextTaskDueAt ? new Date(input.nextTaskDueAt) : null,
      createdBy: session.userId,
      updatedBy: session.userId,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (companyId) {
    await refreshCompanyStats(tx, session.orgId, companyId);
  }

  return {
    id: opportunityId,
    contactId: input.contactId,
    companyId,
    pipelineId: input.pipelineId,
  };
}
