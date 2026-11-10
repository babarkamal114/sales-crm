import 'server-only';

import { and, desc, eq, isNull } from 'drizzle-orm';
import {
  addDays,
  outreachSequenceForLifecycle,
  type OutreachSequenceDefinition,
} from '@/domain/contacts/email-outreach-sequences';
import {
  listOrgOutreachSequences,
  resolveOutreachSequenceByKey,
  resolveOutreachSequenceForContact,
} from '@/server/services/contacts/org-outreach-sequence';
import type { ContactEmailSequenceView } from '@/domain/contacts/email-sequence-view';
import { assertCan } from '@/server/access/capabilities';
import { contactOutreachSequence, contactTask, orgOutreachSequence } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { requireContactView } from '@/server/services/contacts/contact-access';
import { createContactTask } from '@/server/services/contacts/contact-tasks';
import { syncContactNextTaskDueAt } from '@/server/services/contacts/sync-contact-next-task';
import { listContactEmailTemplates } from '@/server/services/contacts/contact-email-templates';
import { htmlToPlainPreview } from '@/lib/email/html-to-plain-preview';
import type { ContactEmailTemplateView } from '@/domain/contacts/email-template-view';

function templateForStep(
  templatesByKey: Map<string, ContactEmailTemplateView>,
  stepKey: string,
): ContactEmailSequenceView['steps'][number]['template'] {
  const row = templatesByKey.get(stepKey);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    bodyPreview: htmlToPlainPreview(row.bodyHtml),
  };
}

function buildStepViews(
  def: OutreachSequenceDefinition,
  currentStepIndex: number,
  nextDueAt: Date | null,
  lastSentAt: Date | null,
  templatesByKey: Map<string, ContactEmailTemplateView>,
): ContactEmailSequenceView['steps'] {
  return def.steps.map((step, index) => {
    let status: 'done' | 'current' | 'upcoming' = 'upcoming';
    if (index < currentStepIndex) status = 'done';
    else if (index === currentStepIndex) status = 'current';

    let dueAt: string | null = null;
    if (status === 'current' && nextDueAt) {
      dueAt = nextDueAt.toISOString();
    } else if (status === 'upcoming' && lastSentAt && index === currentStepIndex + 1) {
      dueAt = addDays(lastSentAt, step.daysAfterPrevious).toISOString();
    }

    return {
      index,
      stepKey: step.stepKey,
      label: step.label,
      status,
      dueAt,
      reminderTitle: step.reminderTitle,
      template: templateForStep(templatesByKey, step.stepKey),
    };
  });
}

function effectiveNextDue(
  row: {
    scheduledStartAt: Date | null;
    nextDueAt: Date | null;
    currentStepIndex: number;
    lastSentAt: Date | null;
  },
  def: OutreachSequenceDefinition,
): Date | null {
  if (row.currentStepIndex >= def.steps.length) return null;

  const scheduled = row.scheduledStartAt;
  const baseDue = row.nextDueAt;
  if (row.currentStepIndex === 0 && !row.lastSentAt && scheduled) {
    const startMs = scheduled.getTime();
    if (startMs > Date.now()) {
      return scheduled;
    }
  }

  return baseDue;
}

const ENROLLMENT_STATUSES = ['active', 'replied', 'paused'] as const;

async function findCurrentEnrollment(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
) {
  const rows = await tx
    .select()
    .from(contactOutreachSequence)
    .where(
      and(
        eq(contactOutreachSequence.orgId, session.orgId),
        eq(contactOutreachSequence.contactId, contactId),
      ),
    )
    .orderBy(desc(contactOutreachSequence.updatedAt));

  for (const status of ENROLLMENT_STATUSES) {
    const match = rows.find((row) => row.status === status);
    if (match) return match;
  }

  return null;
}

async function ensureSequenceRow(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
  lifecycle: string,
) {
  const existing = await findCurrentEnrollment(tx, session, contactId);
  if (existing) {
    const def = await resolveOutreachSequenceByKey(tx, session, existing.sequenceKey);
    return { row: existing, def };
  }

  const def = await resolveOutreachSequenceForContact(tx, session, lifecycle);
  const now = new Date();
  const [created] = await tx
    .insert(contactOutreachSequence)
    .values({
      orgId: session.orgId,
      contactId,
      sequenceKey: def.key,
      status: 'active',
      currentStepIndex: 0,
      startedAt: now,
      nextDueAt: now,
      scheduledStartAt: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return { row: created!, def };
}

function buildAvailableSequences(
  lifecycle: string,
  items: Awaited<ReturnType<typeof listOrgOutreachSequences>>,
) {
  const lifecycleDefault = outreachSequenceForLifecycle(lifecycle).key;
  return items.map((item) => ({
    sequenceKey: item.sequenceKey,
    label: item.label,
    isLifecycleDefault: item.sequenceKey === lifecycleDefault,
  }));
}

export async function getContactEmailSequence(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
): Promise<ContactEmailSequenceView> {
  assertCan(session, 'contact.view');
  const c = await requireContactView(tx, session, contactId);
  const { row, def } = await ensureSequenceRow(tx, session, contactId, c.lifecycle);
  const orgSequences = await listOrgOutreachSequences(tx, session);

  const nextDue = effectiveNextDue(row, def);
  const finished = row.currentStepIndex >= def.steps.length;
  const isOverdue =
    row.status === 'active' &&
    !finished &&
    nextDue !== null &&
    nextDue.getTime() < Date.now();

  const stepIndex = finished ? def.steps.length : row.currentStepIndex;

  const [customRow] = await tx
    .select({ id: orgOutreachSequence.id })
    .from(orgOutreachSequence)
    .where(
      and(
        eq(orgOutreachSequence.orgId, session.orgId),
        eq(orgOutreachSequence.sequenceKey, def.key),
      ),
    )
    .limit(1);

  const templates = await listContactEmailTemplates(tx, session);
  const templatesByKey = new Map(templates.map((template) => [template.stepKey, template]));

  return {
    sequenceKey: def.key,
    sequenceLabel: def.label,
    availableSequences: buildAvailableSequences(c.lifecycle, orgSequences),
    status: row.status as ContactEmailSequenceView['status'],
    currentStepIndex: row.currentStepIndex,
    nextDueAt: finished ? null : nextDue?.toISOString() ?? null,
    scheduledStartAt: row.scheduledStartAt?.toISOString() ?? null,
    lastSentAt: row.lastSentAt?.toISOString() ?? null,
    steps: buildStepViews(
      def,
      stepIndex,
      finished ? null : nextDue,
      row.lastSentAt,
      templatesByKey,
    ),
    isOverdue,
    isCustomised: Boolean(customRow),
  };
}

async function completeOpenEmailReminders(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
) {
  const open = await tx
    .select({ id: contactTask.id })
    .from(contactTask)
    .where(
      and(
        eq(contactTask.orgId, session.orgId),
        eq(contactTask.contactId, contactId),
        eq(contactTask.kind, 'email_reminder'),
        isNull(contactTask.deletedAt),
        isNull(contactTask.completedAt),
      ),
    );

  const now = new Date();
  for (const task of open) {
    await tx
      .update(contactTask)
      .set({
        completedAt: now,
        completedBy: session.userId,
        updatedAt: now,
        updatedBy: session.userId,
      })
      .where(eq(contactTask.id, task.id));
  }
}

export async function advanceContactEmailSequenceAfterSend(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
  input: { sentStepKey: string; scheduleNextReminder: boolean },
): Promise<void> {
  assertCan(session, 'contact.view');
  const c = await requireContactView(tx, session, contactId);
  const { row, def } = await ensureSequenceRow(tx, session, contactId, c.lifecycle);

  if (row.status !== 'active') return;

  const expectedStep = def.steps[row.currentStepIndex];
  if (!expectedStep || expectedStep.stepKey !== input.sentStepKey) {
    return;
  }

  await completeOpenEmailReminders(tx, session, contactId);

  const now = new Date();
  const nextIndex = row.currentStepIndex + 1;
  const completed = nextIndex >= def.steps.length;

  let nextDueAt: Date | null = null;
  if (!completed) {
    const nextStep = def.steps[nextIndex]!;
    nextDueAt = addDays(now, nextStep.daysAfterPrevious);
  }

  await tx
    .update(contactOutreachSequence)
    .set({
      currentStepIndex: completed ? def.steps.length : nextIndex,
      lastSentAt: now,
      nextDueAt: completed ? null : nextDueAt,
      status: completed ? 'completed' : 'active',
      updatedAt: now,
    })
    .where(eq(contactOutreachSequence.id, row.id));

  if (!completed && input.scheduleNextReminder && nextDueAt) {
    const nextStep = def.steps[nextIndex]!;
    await createContactTask(tx, session, {
      contactId,
      title: nextStep.reminderTitle,
      kind: 'email_reminder',
      dueAt: nextDueAt.toISOString(),
      assigneeId: c.ownerId,
    });
  } else {
    await syncContactNextTaskDueAt(tx, session.orgId, contactId);
  }
}

export async function skipContactEmailSequenceStep(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
): Promise<ContactEmailSequenceView> {
  assertCan(session, 'contact.update');
  const c = await requireContactView(tx, session, contactId);
  const { row, def } = await ensureSequenceRow(tx, session, contactId, c.lifecycle);

  if (row.status !== 'active' || row.currentStepIndex >= def.steps.length) {
    return getContactEmailSequence(tx, session, contactId);
  }

  await completeOpenEmailReminders(tx, session, contactId);

  const now = new Date();
  const nextIndex = row.currentStepIndex + 1;
  const completed = nextIndex >= def.steps.length;
  const nextStep = completed ? null : def.steps[nextIndex]!;
  const nextDueAt = completed ? null : addDays(now, nextStep!.daysAfterPrevious);

  await tx
    .update(contactOutreachSequence)
    .set({
      currentStepIndex: completed ? def.steps.length : nextIndex,
      nextDueAt,
      status: completed ? 'completed' : 'active',
      updatedAt: now,
    })
    .where(eq(contactOutreachSequence.id, row.id));

  if (!completed && nextStep) {
    await createContactTask(tx, session, {
      contactId,
      title: nextStep.reminderTitle,
      kind: 'email_reminder',
      dueAt: nextDueAt!.toISOString(),
      assigneeId: c.ownerId,
    });
  }

  return getContactEmailSequence(tx, session, contactId);
}

export async function pauseContactEmailSequence(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
): Promise<ContactEmailSequenceView> {
  assertCan(session, 'contact.update');
  await requireContactView(tx, session, contactId);

  const [row] = await tx
    .select()
    .from(contactOutreachSequence)
    .where(
      and(
        eq(contactOutreachSequence.orgId, session.orgId),
        eq(contactOutreachSequence.contactId, contactId),
        eq(contactOutreachSequence.status, 'active'),
      ),
    )
    .limit(1);

  if (row) {
    await tx
      .update(contactOutreachSequence)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(eq(contactOutreachSequence.id, row.id));
  }

  return getContactEmailSequence(tx, session, contactId);
}

export async function switchContactEmailSequence(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
  sequenceKey: string,
): Promise<ContactEmailSequenceView> {
  assertCan(session, 'contact.update');
  const c = await requireContactView(tx, session, contactId);
  const def = await resolveOutreachSequenceByKey(tx, session, sequenceKey);

  await completeOpenEmailReminders(tx, session, contactId);

  const now = new Date();

  await tx
    .update(contactOutreachSequence)
    .set({
      status: 'paused',
      pauseReason: 'switched_sequence',
      updatedAt: now,
    })
    .where(
      and(
        eq(contactOutreachSequence.orgId, session.orgId),
        eq(contactOutreachSequence.contactId, contactId),
        eq(contactOutreachSequence.status, 'active'),
      ),
    );

  const [existing] = await tx
    .select()
    .from(contactOutreachSequence)
    .where(
      and(
        eq(contactOutreachSequence.orgId, session.orgId),
        eq(contactOutreachSequence.contactId, contactId),
        eq(contactOutreachSequence.sequenceKey, def.key),
      ),
    )
    .orderBy(desc(contactOutreachSequence.createdAt))
    .limit(1);

  if (existing) {
    await tx
      .update(contactOutreachSequence)
      .set({
        status: 'active',
        currentStepIndex: 0,
        lastSentAt: null,
        nextDueAt: now,
        scheduledStartAt: null,
        pauseReason: null,
        repliedAt: null,
        startedAt: now,
        updatedAt: now,
      })
      .where(eq(contactOutreachSequence.id, existing.id));
  } else {
    await tx.insert(contactOutreachSequence).values({
      orgId: session.orgId,
      contactId: c.id,
      sequenceKey: def.key,
      status: 'active',
      currentStepIndex: 0,
      startedAt: now,
      nextDueAt: now,
      scheduledStartAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  const firstStep = def.steps[0];
  if (firstStep) {
    await createContactTask(tx, session, {
      contactId,
      title: firstStep.reminderTitle,
      kind: 'email_reminder',
      dueAt: now.toISOString(),
      assigneeId: c.ownerId,
    });
  }

  return getContactEmailSequence(tx, session, contactId);
}

export async function scheduleContactEmailSequence(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
  scheduledStartAt: string,
): Promise<ContactEmailSequenceView> {
  assertCan(session, 'contact.update');
  const c = await requireContactView(tx, session, contactId);
  const { row, def } = await ensureSequenceRow(tx, session, contactId, c.lifecycle);

  const start = new Date(scheduledStartAt);
  if (Number.isNaN(start.getTime())) {
    throw new Error('Invalid schedule date.');
  }

  const now = new Date();
  const nextDueAt =
    row.currentStepIndex === 0 && !row.lastSentAt
      ? start.getTime() > now.getTime()
        ? start
        : now
      : row.nextDueAt ?? now;

  await tx
    .update(contactOutreachSequence)
    .set({
      scheduledStartAt: start,
      nextDueAt,
      ...(row.status === 'replied'
        ? { status: 'active' as const, pauseReason: null, repliedAt: null }
        : {}),
      updatedAt: now,
    })
    .where(eq(contactOutreachSequence.id, row.id));

  if (row.currentStepIndex === 0 && !row.lastSentAt && start.getTime() > now.getTime()) {
    await completeOpenEmailReminders(tx, session, contactId);
    const firstStep = def.steps[0];
    if (firstStep) {
      await createContactTask(tx, session, {
        contactId,
        title: firstStep.reminderTitle,
        kind: 'email_reminder',
        dueAt: start.toISOString(),
        assigneeId: c.ownerId,
      });
    }
  }

  return getContactEmailSequence(tx, session, contactId);
}
