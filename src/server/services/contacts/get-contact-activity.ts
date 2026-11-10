import 'server-only';

import { and, desc, eq, isNull } from 'drizzle-orm';
import type { ContactActivityFeed } from '@/domain/contacts/profile-view';
import { assertCan } from '@/server/access/capabilities';
import {
  attribution,
  contactEmailSend,
  contactNote,
  contactTask,
  opportunity,
  opportunityNote,
  opportunityStageHistory,
  user,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { requireContactView } from '@/server/services/contacts/contact-access';

export async function getContactActivityFeed(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
  limit = 50,
): Promise<ContactActivityFeed> {
  assertCan(session, 'contact.view');
  const c = await requireContactView(tx, session, contactId);

  const [contactNotes, dealNotes, tasks, stageMoves, emailSends, attributionRows] =
    await Promise.all([
    tx
      .select({
        id: contactNote.id,
        body: contactNote.body,
        createdAt: contactNote.createdAt,
        authorName: user.fullName,
      })
      .from(contactNote)
      .innerJoin(user, eq(contactNote.createdBy, user.id))
      .where(
        and(
          eq(contactNote.orgId, session.orgId),
          eq(contactNote.contactId, c.id),
          isNull(contactNote.deletedAt),
        ),
      )
      .orderBy(desc(contactNote.createdAt))
      .limit(limit),
    tx
      .select({
        id: opportunityNote.id,
        body: opportunityNote.body,
        createdAt: opportunityNote.createdAt,
      })
      .from(opportunityNote)
      .where(
        and(
          eq(opportunityNote.orgId, session.orgId),
          eq(opportunityNote.contactId, c.id),
          isNull(opportunityNote.deletedAt),
        ),
      )
      .orderBy(desc(opportunityNote.createdAt))
      .limit(limit),
    tx
      .select({
        id: contactTask.id,
        title: contactTask.title,
        kind: contactTask.kind,
        createdAt: contactTask.createdAt,
        completedAt: contactTask.completedAt,
      })
      .from(contactTask)
      .where(
        and(
          eq(contactTask.orgId, session.orgId),
          eq(contactTask.contactId, c.id),
          isNull(contactTask.deletedAt),
        ),
      )
      .orderBy(desc(contactTask.createdAt))
      .limit(limit),
    tx
      .select({
        id: opportunityStageHistory.id,
        movedAt: opportunityStageHistory.movedAt,
      })
      .from(opportunityStageHistory)
      .innerJoin(opportunity, eq(opportunityStageHistory.opportunityId, opportunity.id))
      .where(
        and(eq(opportunity.contactId, c.id), eq(opportunityStageHistory.orgId, session.orgId)),
      )
      .orderBy(desc(opportunityStageHistory.movedAt))
      .limit(limit),
    tx
      .select({
        id: contactEmailSend.id,
        subject: contactEmailSend.subject,
        status: contactEmailSend.status,
        createdAt: contactEmailSend.createdAt,
      })
      .from(contactEmailSend)
      .where(
        and(eq(contactEmailSend.orgId, session.orgId), eq(contactEmailSend.contactId, c.id)),
      )
      .orderBy(desc(contactEmailSend.createdAt))
      .limit(limit),
    tx
      .select()
      .from(attribution)
      .where(and(eq(attribution.orgId, session.orgId), eq(attribution.contactId, c.id)))
      .orderBy(desc(attribution.capturedAt)),
  ]);

  const items = [
    ...contactNotes.map((note) => ({
      id: `cnote-${note.id}`,
      kind: 'note' as const,
      label: `${note.authorName?.trim() || 'Teammate'} left a note: ${note.body.slice(0, 100)}${note.body.length > 100 ? '…' : ''}`,
      at: note.createdAt.toISOString(),
    })),
    ...dealNotes.map((note) => ({
      id: `dnote-${note.id}`,
      kind: 'note' as const,
      label: `Deal note: ${note.body.slice(0, 120)}${note.body.length > 120 ? '…' : ''}`,
      at: note.createdAt.toISOString(),
    })),
    ...tasks.map((task) => ({
      id: `task-${task.id}`,
      kind: 'task' as const,
      label: task.completedAt
        ? `Task completed: ${task.title}`
        : task.kind === 'member_request'
          ? `Help requested: ${task.title}`
          : `Task: ${task.title}`,
      at: (task.completedAt ?? task.createdAt).toISOString(),
    })),
    ...stageMoves.map((move) => ({
      id: `stage-${move.id}`,
      kind: 'stage_move' as const,
      label: 'Deal moved to a new stage',
      at: move.movedAt.toISOString(),
    })),
    ...emailSends.map((mail) => ({
      id: `email-${mail.id}`,
      kind: 'email' as const,
      label:
        mail.status === 'sent'
          ? `Email sent: ${mail.subject}`
          : mail.status === 'failed'
            ? `Email failed: ${mail.subject}`
            : `Email skipped: ${mail.subject}`,
      at: mail.createdAt.toISOString(),
    })),
    {
      id: `created-${c.id}`,
      kind: 'created' as const,
      label: `Contact created${c.source ? ` from ${c.source}` : ''}`,
      at: c.createdAt.toISOString(),
    },
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);

  return {
    items,
    attribution: attributionRows.map((row) => ({
      touch: row.touch,
      source: row.source,
      medium: row.medium,
      campaign: row.campaign,
      form: row.form,
      pageUrl: row.pageUrl,
      capturedAt: row.capturedAt.toISOString(),
    })),
  };
}
