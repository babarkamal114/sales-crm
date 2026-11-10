import 'server-only';

import { and, desc, eq } from 'drizzle-orm';
import { assertCan } from '@/server/access/capabilities';
import {
  contactEmailReplyDraft,
  contactEmailSend,
  contactOutreachSequence,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { listGmailInboundFromAddress } from '@/server/integrations/google-mail-read';
import { createContactNote } from '@/server/services/contacts/contact-notes';
import { generateContactEmailReplyDraft } from '@/server/services/contacts/contact-email-reply-ai';
import { requireContactView } from '@/server/services/contacts/contact-access';
import { notifyContactEmailReply } from '@/server/services/notifications/org-user-notifications';

import type { ContactEmailReplyDraftView } from '@/domain/contacts/outreach-sequence-view';

export async function getPendingContactEmailReplyDraft(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
): Promise<ContactEmailReplyDraftView | null> {
  assertCan(session, 'contact.view');
  await requireContactView(tx, session, contactId);

  const [row] = await tx
    .select()
    .from(contactEmailReplyDraft)
    .where(
      and(
        eq(contactEmailReplyDraft.orgId, session.orgId),
        eq(contactEmailReplyDraft.contactId, contactId),
        eq(contactEmailReplyDraft.status, 'pending'),
      ),
    )
    .orderBy(desc(contactEmailReplyDraft.createdAt))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    gmailMessageId: row.gmailMessageId,
    inboundFrom: row.inboundFrom,
    inboundSubject: row.inboundSubject,
    inboundPreview: row.inboundPreview,
    draftSubject: row.draftSubject,
    draftHtml: row.draftHtml,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function dismissContactEmailReplyDraft(
  tx: DbTransaction,
  session: TenantSession,
  input: { contactId: string; draftId: string },
): Promise<void> {
  assertCan(session, 'contact.update');
  await requireContactView(tx, session, input.contactId);

  await tx
    .update(contactEmailReplyDraft)
    .set({
      status: 'dismissed',
      updatedAt: new Date(),
      updatedBy: session.userId,
    })
    .where(
      and(
        eq(contactEmailReplyDraft.id, input.draftId),
        eq(contactEmailReplyDraft.orgId, session.orgId),
        eq(contactEmailReplyDraft.contactId, input.contactId),
        eq(contactEmailReplyDraft.status, 'pending'),
      ),
    );
}

export async function markContactEmailReplyDraftSent(
  tx: DbTransaction,
  session: TenantSession,
  input: { contactId: string; draftId: string },
): Promise<void> {
  assertCan(session, 'contact.update');
  await requireContactView(tx, session, input.contactId);

  await tx
    .update(contactEmailReplyDraft)
    .set({
      status: 'sent',
      updatedAt: new Date(),
      updatedBy: session.userId,
    })
    .where(
      and(
        eq(contactEmailReplyDraft.id, input.draftId),
        eq(contactEmailReplyDraft.orgId, session.orgId),
        eq(contactEmailReplyDraft.contactId, input.contactId),
      ),
    );
}

export async function syncContactEmailReplies(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
  context: {
    orgName: string;
    senderName: string;
  },
): Promise<{ foundReply: boolean; draft: ContactEmailReplyDraftView | null }> {
  assertCan(session, 'contact.view');
  const c = await requireContactView(tx, session, contactId);

  if (!c.email?.trim()) {
    return { foundReply: false, draft: await getPendingContactEmailReplyDraft(tx, session, contactId) };
  }

  const [lastOutbound] = await tx
    .select()
    .from(contactEmailSend)
    .where(
      and(
        eq(contactEmailSend.orgId, session.orgId),
        eq(contactEmailSend.contactId, contactId),
        eq(contactEmailSend.status, 'sent'),
      ),
    )
    .orderBy(desc(contactEmailSend.createdAt))
    .limit(1);

  const afterMs = lastOutbound
    ? lastOutbound.createdAt.getTime() - 60_000
    : Date.now() - 90 * 24 * 60 * 60 * 1000;

  const inbox = await listGmailInboundFromAddress(tx, session.orgId, {
    fromAddress: c.email.trim(),
    afterMs,
    maxResults: 6,
  });

  if (!inbox.ok) {
    return { foundReply: false, draft: await getPendingContactEmailReplyDraft(tx, session, contactId) };
  }

  let foundNew = false;

  for (const message of inbox.messages) {
    const [existingDraft] = await tx
      .select({ id: contactEmailReplyDraft.id })
      .from(contactEmailReplyDraft)
      .where(
        and(
          eq(contactEmailReplyDraft.orgId, session.orgId),
          eq(contactEmailReplyDraft.gmailMessageId, message.id),
        ),
      )
      .limit(1);

    if (existingDraft) continue;

    foundNew = true;

    const ai = await generateContactEmailReplyDraft({
      contactFirstName: c.firstName ?? '',
      contactFullName: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email,
      orgName: context.orgName,
      senderName: context.senderName,
      inboundSubject: message.subject,
      inboundPreview: message.snippet,
      lastOutboundSubject: lastOutbound?.subject,
      lastOutboundSnippet: lastOutbound?.bodyHtml,
    });

    const now = new Date();
    await tx.insert(contactEmailReplyDraft).values({
      orgId: session.orgId,
      contactId,
      gmailMessageId: message.id,
      inboundFrom: message.from,
      inboundSubject: message.subject,
      inboundPreview: message.snippet,
      draftSubject: ai.subject,
      draftHtml: ai.html,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      updatedBy: session.userId,
    });

    const [activeSequence] = await tx
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

    if (activeSequence) {
      await tx
        .update(contactOutreachSequence)
        .set({
          status: 'replied',
          pauseReason: 'contact_replied',
          repliedAt: now,
          nextDueAt: null,
          updatedAt: now,
        })
        .where(eq(contactOutreachSequence.id, activeSequence.id));
    }

    const contactName =
      `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email || 'Contact';

    await notifyContactEmailReply(tx, session, {
      contactId,
      contactName,
      ownerId: c.ownerId,
      preview: message.snippet,
    });

    await createContactNote(tx, session, {
      contactId,
      body: `📩 ${contactName} replied to outreach. An AI draft reply is ready on the Email tab for review.`,
    });

    break;
  }

  const draft = await getPendingContactEmailReplyDraft(tx, session, contactId);
  return { foundReply: foundNew, draft };
}
