import 'server-only';

import { alias } from 'drizzle-orm/pg-core';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type {
  CreateOpportunityTaskInput,
  SetOpportunityTaskCompletedInput,
} from '@/domain/opportunities/collaboration-schemas';
import { assertCan, NotFoundError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import { membership, opportunityTask, user } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  requireOpportunityAccess,
  touchOpportunityActivity,
} from '@/server/services/opportunities/opportunity-access';

export type OpportunityTaskView = {
  id: string;
  title: string;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  assignee: { id: string; fullName: string } | null;
  createdBy: { id: string; fullName: string };
};

export type TeamMemberOption = {
  id: string;
  fullName: string;
  initials: string;
};

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export async function listOrgTeamMembers(
  tx: DbTransaction,
  orgId: string,
): Promise<TeamMemberOption[]> {
  const rows = await tx
    .select({
      id: user.id,
      fullName: user.fullName,
    })
    .from(membership)
    .innerJoin(user, eq(membership.userId, user.id))
    .where(eq(membership.orgId, orgId))
    .orderBy(asc(user.fullName));

  return rows.map((row) => {
    const name = row.fullName?.trim() || 'User';
    return { id: row.id, fullName: name, initials: initials(name) };
  });
}

export async function listOpportunityTasks(
  tx: DbTransaction,
  session: TenantSession,
  opportunityId: string,
  limit = 50,
): Promise<OpportunityTaskView[]> {
  await requireOpportunityAccess(tx, session, opportunityId);

  const assignee = alias(user, 'assignee_user');
  const creator = alias(user, 'creator_user');

  const rows = await tx
    .select({
      id: opportunityTask.id,
      title: opportunityTask.title,
      dueAt: opportunityTask.dueAt,
      completedAt: opportunityTask.completedAt,
      createdAt: opportunityTask.createdAt,
      assigneeId: assignee.id,
      assigneeName: assignee.fullName,
      creatorId: creator.id,
      creatorName: creator.fullName,
    })
    .from(opportunityTask)
    .innerJoin(creator, eq(opportunityTask.createdBy, creator.id))
    .leftJoin(assignee, eq(opportunityTask.assigneeId, assignee.id))
    .where(
      and(
        eq(opportunityTask.orgId, session.orgId),
        eq(opportunityTask.opportunityId, opportunityId),
        isNull(opportunityTask.deletedAt),
      ),
    )
    .orderBy(asc(opportunityTask.completedAt), asc(opportunityTask.dueAt), asc(opportunityTask.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    dueAt: row.dueAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    assignee:
      row.assigneeId && row.assigneeName
        ? { id: row.assigneeId, fullName: row.assigneeName.trim() || 'User' }
        : null,
    createdBy: {
      id: row.creatorId,
      fullName: row.creatorName?.trim() || 'User',
    },
  }));
}

async function assertAssigneeInOrg(
  tx: DbTransaction,
  orgId: string,
  assigneeId: string,
): Promise<void> {
  const [row] = await tx
    .select({ userId: membership.userId })
    .from(membership)
    .where(and(eq(membership.orgId, orgId), eq(membership.userId, assigneeId)))
    .limit(1);

  if (!row) {
    throw new NotFoundError('Assignee not found.');
  }
}

export async function createOpportunityTask(
  tx: DbTransaction,
  session: TenantSession,
  input: CreateOpportunityTaskInput,
): Promise<{ id: string }> {
  assertCan(session, 'opportunity.update');
  const deal = await requireOpportunityAccess(tx, session, input.opportunityId);

  if (input.assigneeId) {
    await assertAssigneeInOrg(tx, session.orgId, input.assigneeId);
  }

  const now = new Date();
  const dueAt = input.dueAt ? new Date(input.dueAt) : null;

  const [row] = await tx
    .insert(opportunityTask)
    .values({
      orgId: session.orgId,
      contactId: deal.contactId,
      opportunityId: deal.id,
      title: input.title,
      assigneeId: input.assigneeId ?? session.userId,
      dueAt,
      createdBy: session.userId,
      updatedBy: session.userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: opportunityTask.id });

  await touchOpportunityActivity(tx, session, deal.id, now);

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'opportunity.task_created',
    entityType: 'opportunity',
    entityId: deal.id,
    changes: { taskId: { from: null, to: row!.id }, title: { from: null, to: input.title } },
  });

  return { id: row!.id };
}

export async function setOpportunityTaskCompleted(
  tx: DbTransaction,
  session: TenantSession,
  input: SetOpportunityTaskCompletedInput,
): Promise<{ id: string }> {
  assertCan(session, 'opportunity.update');

  const [task] = await tx
    .select()
    .from(opportunityTask)
    .where(
      and(
        eq(opportunityTask.orgId, session.orgId),
        eq(opportunityTask.id, input.taskId),
        isNull(opportunityTask.deletedAt),
      ),
    )
    .limit(1);

  if (!task) {
    throw new NotFoundError('Task not found.');
  }

  await requireOpportunityAccess(tx, session, task.opportunityId);

  const now = new Date();
  const completedAt = input.completed ? now : null;
  const completedBy = input.completed ? session.userId : null;

  await tx
    .update(opportunityTask)
    .set({
      completedAt,
      completedBy,
      updatedAt: now,
      updatedBy: session.userId,
      version: task.version + 1,
    })
    .where(eq(opportunityTask.id, task.id));

  await touchOpportunityActivity(tx, session, task.opportunityId, now);

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: input.completed ? 'opportunity.task_completed' : 'opportunity.task_reopened',
    entityType: 'opportunity_task',
    entityId: task.id,
    changes: {
      completed: { from: Boolean(task.completedAt), to: input.completed },
    },
  });

  return { id: task.id };
}
