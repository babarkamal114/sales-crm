import 'server-only';

import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { SendContactEmailInput as SendContactEmailInputType } from '@/domain/contacts/email-schemas';
import {
  buildEmailMergeContext,
  mergeEmailTemplate,
  templateContainsMergeTokens,
} from '@/domain/contacts/email-merge';
import { displayName } from '@/domain/contacts/display-name';
import type { SendContactEmailResult } from '@/domain/contacts/email-template-view';
import { canContactSummary } from '@/domain/contacts/consent';
import { assertCan } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import {
  company,
  contact,
  contactConsent,
  contactEmailSend,
  organisation,
  user,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { sendCrmEmail } from '@/server/email/send-crm-email';
import { fetchGmailMessageThreadId } from '@/server/integrations/google-mail-read';
import { touchContactActivity } from '@/server/services/contacts/contact-access';
import { advanceContactEmailSequenceAfterSend } from '@/server/services/contacts/contact-email-sequence';
import { markContactEmailReplyDraftSent } from '@/server/services/contacts/contact-email-reply-sync';
import { upsertContactEmailTemplate } from '@/server/services/contacts/contact-email-templates';

function emailTemplateMeta(input: SendContactEmailInputType) {
  return {
    ...(input.templateId ? { templateId: input.templateId } : {}),
    ...(input.stepKey ? { stepKey: input.stepKey } : {}),
  };
}

export async function sendContactEmails(
  tx: DbTransaction,
  session: TenantSession,
  input: SendContactEmailInputType,
): Promise<SendContactEmailResult> {
  assertCan(session, 'contact.view');

  if (input.saveTemplate) {
    await upsertContactEmailTemplate(tx, session, input.saveTemplate);
  }

  const [orgRow, senderRow] = await Promise.all([
    tx
      .select({ name: organisation.name })
      .from(organisation)
      .where(eq(organisation.id, session.orgId))
      .limit(1),
    tx
      .select({ fullName: user.fullName, email: user.email })
      .from(user)
      .where(eq(user.id, session.userId))
      .limit(1),
  ]);

  const orgName = orgRow[0]?.name?.trim() || 'CRM';
  const senderName = senderRow[0]?.fullName?.trim() || 'Team';
  const replyTo = senderRow[0]?.email?.trim() || undefined;

  const rows = await tx
    .select({
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phoneE164: contact.phoneE164,
      recipientType: contact.recipientType,
      restricted: contact.restricted,
      companyId: contact.companyId,
    })
    .from(contact)
    .where(
      and(
        eq(contact.orgId, session.orgId),
        inArray(contact.id, input.contactIds),
        isNull(contact.deletedAt),
      ),
    );

  const byId = new Map(rows.map((r) => [r.id, r]));
  const companyIds = [...new Set(rows.map((r) => r.companyId).filter(Boolean))] as string[];
  const companyRows =
    companyIds.length > 0
      ? await tx
          .select({ id: company.id, name: company.name })
          .from(company)
          .where(and(eq(company.orgId, session.orgId), inArray(company.id, companyIds)))
      : [];
  const companyById = new Map(companyRows.map((c) => [c.id, c.name]));

  const needsMerge =
    templateContainsMergeTokens(input.subject) || templateContainsMergeTokens(input.bodyHtml);

  const result: SendContactEmailResult = {
    sent: 0,
    failed: 0,
    skipped: 0,
    skippedReasons: [],
    failures: [],
  };

  for (const contactId of input.contactIds) {
    const row = byId.get(contactId);
    if (!row) {
      result.skipped += 1;
      result.skippedReasons.push({ contactId, reason: 'not_visible' });
      continue;
    }

    if (row.restricted) {
      result.skipped += 1;
      result.skippedReasons.push({ contactId, reason: 'restricted' });
      await logSend(tx, session, {
        contactId,
        ...emailTemplateMeta(input),
        toAddress: row.email ?? '',
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        status: 'skipped',
        errorMessage: 'Contact is restricted',
      });
      continue;
    }

    if (!row.email?.trim()) {
      result.skipped += 1;
      result.skippedReasons.push({ contactId, reason: 'no_email' });
      continue;
    }

    const consentRows = await tx
      .select({
        channel: contactConsent.channel,
        dnd: contactConsent.dnd,
        marketingConsent: contactConsent.marketingConsent,
      })
      .from(contactConsent)
      .where(and(eq(contactConsent.orgId, session.orgId), eq(contactConsent.contactId, row.id)));

    const summary = canContactSummary(
      {
        email: row.email,
        phoneE164: row.phoneE164,
        recipientType: row.recipientType,
        restricted: row.restricted,
      },
      consentRows.map((c) => ({
        channel: c.channel,
        dnd: c.dnd,
        marketingConsent: c.marketingConsent,
      })),
    );

    if (!summary.email.allowed) {
      result.skipped += 1;
      result.skippedReasons.push({
        contactId,
        reason: summary.email.reason ?? 'email_blocked',
      });
      await logSend(tx, session, {
        contactId,
        ...emailTemplateMeta(input),
        toAddress: row.email,
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        status: 'skipped',
        errorMessage: summary.email.reason ?? 'Email not allowed',
      });
      continue;
    }

    const mergeCtx = buildEmailMergeContext({
      firstName: row.firstName,
      lastName: row.lastName,
      displayName: displayName(row),
      companyName: row.companyId ? (companyById.get(row.companyId) ?? null) : null,
      senderName,
      orgName,
    });

    const subject = needsMerge ? mergeEmailTemplate(input.subject, mergeCtx) : input.subject;
    const bodyHtml = needsMerge ? mergeEmailTemplate(input.bodyHtml, mergeCtx) : input.bodyHtml;

    const sendResult = await sendCrmEmail(tx, session.orgId, {
      to: row.email,
      subject,
      html: bodyHtml,
      ...(replyTo ? { replyTo } : {}),
    });

    if (!sendResult.ok) {
      result.failed += 1;
      const reason =
        sendResult.reason === 'google_not_connected'
          ? 'Connect Google Mail under Getting started → Integrations.'
          : sendResult.reason === 'google_token_invalid'
            ? 'Google Mail connection expired — reconnect in Integrations.'
            : sendResult.reason === 'invalid_recipient'
              ? 'Invalid email address'
              : 'Gmail rejected the send';
      result.failures.push({ contactId, reason });
      await logSend(tx, session, {
        contactId,
        ...emailTemplateMeta(input),
        toAddress: row.email,
        subject,
        bodyHtml,
        status: 'failed',
        errorMessage: reason,
      });
      continue;
    }

    let providerThreadId: string | null = null;
    if (sendResult.providerMessageId) {
      providerThreadId = await fetchGmailMessageThreadId(
        tx,
        session.orgId,
        sendResult.providerMessageId,
      );
    }

    await logSend(tx, session, {
      contactId,
      ...emailTemplateMeta(input),
      toAddress: row.email,
      subject,
      bodyHtml,
      status: 'sent',
      ...(sendResult.providerMessageId
        ? { providerMessageId: sendResult.providerMessageId }
        : {}),
      ...(providerThreadId ? { providerThreadId } : {}),
    });
    await touchContactActivity(tx, session, contactId, new Date());
    if (
      input.advanceSequence !== false &&
      input.stepKey &&
      input.contactIds.length === 1
    ) {
      await advanceContactEmailSequenceAfterSend(tx, session, contactId, {
        sentStepKey: input.stepKey,
        scheduleNextReminder: input.scheduleNextReminder !== false,
      });
    }
    if (input.replyDraftId && input.contactIds.length === 1) {
      await markContactEmailReplyDraftSent(tx, session, {
        contactId,
        draftId: input.replyDraftId,
      });
    }
    result.sent += 1;
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'contact.email_sent',
    entityType: 'contact',
    changes: {
      sent: { to: result.sent },
      failed: { to: result.failed },
      skipped: { to: result.skipped },
    },
    metadata: {
      templateId: input.templateId,
      stepKey: input.stepKey,
      contactCount: input.contactIds.length,
    },
  });

  return result;
}

async function logSend(
  tx: DbTransaction,
  session: TenantSession,
  input: {
    contactId: string;
    templateId?: string | undefined;
    stepKey?: string | undefined;
    toAddress: string;
    subject: string;
    bodyHtml: string;
    status: 'sent' | 'failed' | 'skipped';
    errorMessage?: string | undefined;
    providerMessageId?: string | null | undefined;
    providerThreadId?: string | null | undefined;
  },
) {
  await tx.insert(contactEmailSend).values({
    orgId: session.orgId,
    contactId: input.contactId,
    templateId: input.templateId ?? null,
    stepKey: input.stepKey ?? null,
    toAddress: input.toAddress,
    subject: input.subject,
    bodyHtml: input.bodyHtml,
    status: input.status,
    errorMessage: input.errorMessage ?? null,
    providerMessageId: input.providerMessageId ?? null,
    providerThreadId: input.providerThreadId ?? null,
    createdBy: session.userId,
  });
}
