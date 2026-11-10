import 'server-only';

import { alias } from 'drizzle-orm/pg-core';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type {
  CreateContactTaskInput,
  SetContactTaskCompletedInput,
} from '@/domain/contacts/collaboration-schemas';
import { assertCan, ForbiddenError, NotFoundError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import { contactTask, membership, user } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  requireContactView,
  touchContactActivity,
} from '@/server/services/contacts/contact-access';
import { syncContactNextTaskDueAt } from '@/server/services/contacts/sync-contact-next-task';

import type { ContactTaskView } from '@/domain/contacts/collaboration-view';

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

export async function listContactTasks(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
  limit = 50,
): Promise<ContactTaskView[]> {
  assertCan(session, 'contact.view');
  await requireContactView(tx, session, contactId);

  const assignee = alias(user, 'assignee_user');
  const creator = alias(user, 'creator_user');

  const rows = await tx
    .select({
      id: contactTask.id,
      title: contactTask.title,
      kind: contactTask.kind,
      dueAt: contactTask.dueAt,
      completedAt: contactTask.completedAt,
      createdAt: contactTask.createdAt,
      assigneeId: assignee.id,
      assigneeName: assignee.fullName,
      creatorId: creator.id,
      creatorName: creator.fullName,
    })
    .from(contactTask)
    .innerJoin(creator, eq(contactTask.createdBy, creator.id))
    .leftJoin(assignee, eq(contactTask.assigneeId, assignee.id))
    .where(
      and(
        eq(contactTask.orgId, session.orgId),
        eq(contactTask.contactId, contactId),
        isNull(contactTask.deletedAt),
      ),
    )
    .orderBy(asc(contactTask.completedAt), asc(contactTask.dueAt), asc(contactTask.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    kind: row.kind,
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

export async function createContactTask(
  tx: DbTransaction,
  session: TenantSession,
  input: CreateContactTaskInput,
): Promise<{ id: string }> {
  assertCan(session, 'contact.view');
  const c = await requireContactView(tx, session, input.contactId);

  if (c.restricted) {
    throw new Error('This contact is restricted.');
  }

  const assigneeId = input.assigneeId ?? session.userId;
  await assertAssigneeInOrg(tx, session.orgId, assigneeId);

  const now = new Date();
  const dueAt = input.dueAt ? new Date(input.dueAt) : null;

  const [row] = await tx
    .insert(contactTask)
    .values({
      orgId: session.orgId,
      contactId: c.id,
      title: input.title,
      kind: input.kind ?? 'follow_up',
      assigneeId,
      dueAt,
      createdBy: session.userId,
      updatedBy: session.userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: contactTask.id });

  await touchContactActivity(tx, session, c.id, now);
  await syncContactNextTaskDueAt(tx, session.orgId, c.id);

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: input.kind === 'member_request' ? 'contact.member_requested' : 'contact.task_created',
    entityType: 'contact',
    entityId: c.id,
    changes: {
      taskId: { from: null, to: row!.id },
      assigneeId: { from: null, to: assigneeId },
    },
  });

  return { id: row!.id };
}

export async function setContactTaskCompleted(
  tx: DbTransaction,
  session: TenantSession,
  input: SetContactTaskCompletedInput,
): Promise<{ id: string }> {
  assertCan(session, 'contact.view');

  const [task] = await tx
    .select()
    .from(contactTask)
    .where(
      and(
        eq(contactTask.orgId, session.orgId),
        eq(contactTask.id, input.taskId),
        isNull(contactTask.deletedAt),
      ),
    )
    .limit(1);

  if (!task) {
    throw new NotFoundError('Task not found.');
  }

  await requireContactView(tx, session, task.contactId);

  const canToggle =
    session.role === 'admin' ||
    session.role === 'manager' ||
    task.createdBy === session.userId ||
    task.assigneeId === session.userId;

  if (!canToggle) {
    throw new ForbiddenError('You cannot update this task.');
  }

  const now = new Date();
  const completedAt = input.completed ? now : null;
  const completedBy = input.completed ? session.userId : null;

  await tx
    .update(contactTask)
    .set({
      completedAt,
      completedBy,
      updatedAt: now,
      updatedBy: session.userId,
      version: task.version + 1,
    })
    .where(eq(contactTask.id, task.id));

  await touchContactActivity(tx, session, task.contactId, now);
  await syncContactNextTaskDueAt(tx, session.orgId, task.contactId);

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: input.completed ? 'contact.task_completed' : 'contact.task_reopened',
    entityType: 'contact_task',
    entityId: task.id,
    changes: {
      completed: { from: Boolean(task.completedAt), to: input.completed },
    },
  });

  return { id: task.id };
}
