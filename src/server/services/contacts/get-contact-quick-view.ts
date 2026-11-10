import 'server-only';

import { and, desc, eq, isNull } from 'drizzle-orm';
import { canContactSummary, type MarketingConsentState } from '@/domain/contacts/consent';
import { displayName } from '@/domain/contacts/display-name';
import { CONSENT_CHANNELS, type ContactQuickView } from '@/domain/contacts/quick-view';
import {
  company,
  contactConsent,
  contactEmailSend,
  contactNote,
  contactTag,
  opportunity,
  opportunityNote,
  opportunityStageHistory,
  pipelineStage,
  tag,
  user,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { requireContactView } from '@/server/services/contacts/contact-access';

function ownerColour(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360} 55% 42%)`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function summariseMarketingConsent(
  rows: { marketingConsent: MarketingConsentState }[],
): MarketingConsentState {
  if (rows.some((row) => row.marketingConsent === 'denied')) return 'denied';
  if (rows.length > 0 && rows.every((row) => row.marketingConsent === 'granted')) {
    return 'granted';
  }
  return 'unknown';
}

function buildPreferences(
  consentRows: (typeof contactConsent.$inferSelect)[],
): ContactQuickView['preferences'] {
  const byChannel = new Map(consentRows.map((row) => [row.channel, row]));
  return CONSENT_CHANNELS.map((channel) => {
    const row = byChannel.get(channel);
    return {
      channel,
      dnd: row?.dnd ?? false,
      marketingConsent: row?.marketingConsent ?? 'unknown',
    };
  });
}

export async function getContactQuickView(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
): Promise<ContactQuickView> {
  const c = await requireContactView(tx, session, contactId);
  const name = displayName(c);

  const [ownerRow, companyRow] = await Promise.all([
    tx
      .select({ fullName: user.fullName })
      .from(user)
      .where(eq(user.id, c.ownerId))
      .limit(1),
    c.companyId
      ? tx
          .select({ id: company.id, name: company.name })
          .from(company)
          .where(and(eq(company.orgId, session.orgId), eq(company.id, c.companyId)))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const ownerDisplay = ownerRow[0]?.fullName?.trim() || 'User';
  const companyName = companyRow[0]?.name ?? null;

  const [consentRows, tagRows, opps, contactNotes, dealNotes, stageMoves, emailSends] =
    await Promise.all([
    tx
      .select()
      .from(contactConsent)
      .where(and(eq(contactConsent.orgId, session.orgId), eq(contactConsent.contactId, c.id))),
    tx
      .select({ id: tag.id, name: tag.name, colourKey: tag.colourKey })
      .from(contactTag)
      .innerJoin(tag, eq(contactTag.tagId, tag.id))
      .where(eq(contactTag.contactId, c.id)),
    tx
      .select({
        id: opportunity.id,
        name: opportunity.name,
        valuePence: opportunity.valuePence,
        status: opportunity.status,
        stageName: pipelineStage.name,
      })
      .from(opportunity)
      .innerJoin(pipelineStage, eq(opportunity.stageId, pipelineStage.id))
      .where(
        and(
          eq(opportunity.orgId, session.orgId),
          eq(opportunity.contactId, c.id),
          isNull(opportunity.deletedAt),
        ),
      )
      .orderBy(desc(opportunity.updatedAt))
      .limit(10),
    tx
      .select({
        id: contactNote.id,
        body: contactNote.body,
        createdAt: contactNote.createdAt,
      })
      .from(contactNote)
      .where(
        and(
          eq(contactNote.orgId, session.orgId),
          eq(contactNote.contactId, c.id),
          isNull(contactNote.deletedAt),
        ),
      )
      .orderBy(desc(contactNote.createdAt))
      .limit(3),
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
      .limit(3),
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
      .limit(3),
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
      .limit(5),
  ]);

  const preferences = buildPreferences(consentRows);
  const activity = [
    ...contactNotes.map((note) => ({
      id: `cnote-${note.id}`,
      label: `Team note: ${note.body.slice(0, 80)}${note.body.length > 80 ? '…' : ''}`,
      at: note.createdAt.toISOString(),
    })),
    ...dealNotes.map((note) => ({
      id: `dnote-${note.id}`,
      label: `Deal note: ${note.body.slice(0, 80)}${note.body.length > 80 ? '…' : ''}`,
      at: note.createdAt.toISOString(),
    })),
    ...stageMoves.map((move) => ({
      id: `stage-${move.id}`,
      label: 'Deal moved to a new stage',
      at: move.movedAt.toISOString(),
    })),
    ...emailSends.map((mail) => ({
      id: `email-${mail.id}`,
      label:
        mail.status === 'sent'
          ? `Email sent: ${mail.subject}`
          : mail.status === 'failed'
            ? `Email failed: ${mail.subject}`
            : `Email skipped: ${mail.subject}`,
      at: mail.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 5);

  return {
    id: c.id,
    version: c.version,
    displayName: name,
    firstName: c.firstName,
    lastName: c.lastName,
    initials: initials(name),
    jobTitle: c.jobTitle,
    companyName,
    companyId: c.companyId,
    email: c.email,
    phoneE164: c.phoneE164,
    emailVerified: c.emailVerified,
    source: c.source,
    createdAt: c.createdAt.toISOString(),
    lastActivityAt: c.lastActivityAt?.toISOString() ?? null,
    restricted: c.restricted,
    lifecycle: c.lifecycle,
    owner: {
      id: c.ownerId,
      fullName: ownerDisplay,
      initials: initials(ownerDisplay),
      colour: ownerColour(c.ownerId),
    },
    tags: tagRows,
    canContact: canContactSummary(
      {
        email: c.email,
        phoneE164: c.phoneE164,
        recipientType: c.recipientType,
        restricted: c.restricted,
      },
      preferences,
    ),
    preferences,
    marketingConsent: summariseMarketingConsent(preferences),
    nextTaskDueAt: c.nextTaskDueAt?.toISOString() ?? null,
    opportunities: opps,
    recentActivity: activity,
  };
}
