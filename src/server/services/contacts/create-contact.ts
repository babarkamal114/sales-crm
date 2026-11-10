import 'server-only';

import { and, eq, isNull, or } from 'drizzle-orm';
import type { ConsentChannel } from '@/domain/contacts/consent';
import { displayName } from '@/domain/contacts/display-name';
import { createContactSchema, type CreateContactInput } from '@/domain/contacts/schemas';
import { normaliseLinkedInProfileUrl } from '@/domain/contacts/linkedin-profile-url';
import { normaliseEmail, normalisePhone, detectPhoneType } from '@/domain/contacts/normalise';
import { assertCan, ForbiddenError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import {
  attribution,
  contact,
  contactConsent,
  contactConsentHistory,
  contactFollower,
  contactNote,
  contactTag,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { ensureConversationForContact } from '@/server/services/conversations/ensure-conversation-for-contact';
import { findSuppressionMatch } from '@/server/services/contacts/check-suppression';
import {
  findCompanyIdByEmailDomain,
  refreshCompanyContactCount,
  syncContactCompanyFromPrimary,
} from '@/server/services/companies/contact-company-link';
import {
  collectContactDateOfBirth,
  isAutoLinkContactsByEmailDomain,
} from '@/server/services/org/crm-settings';
import { createCompanySchema } from '@/domain/companies/schemas';
import { createCompany } from '@/server/services/companies/create-company';
import { createOpportunity } from '@/server/services/opportunities/create-opportunity';

const INBOUND_CHANNELS: ConsentChannel[] = ['email', 'sms', 'whatsapp', 'call'];

export type CreateContactResult = {
  id: string;
  companyId: string | null;
  opportunityId?: string | null;
  suppressionWarning?: boolean;
  suppressionReason?: string;
};

export class DuplicateContactError extends Error {
  readonly code = 'DUPLICATE' as const;
  constructor(public matchingContactId: string) {
    super('A contact with this email or phone already exists.');
    this.name = 'DuplicateContactError';
  }
}

async function findExistingByEmailOrPhone(
  tx: DbTransaction,
  orgId: string,
  emailNormalised: string | null,
  phoneE164: string | null,
  secondaryEmailNormalised: string | null,
  secondaryPhoneE164: string | null,
): Promise<string | null> {
  const emails = [emailNormalised, secondaryEmailNormalised].filter(Boolean) as string[];
  for (const email of emails) {
    const [existing] = await tx
      .select({ id: contact.id })
      .from(contact)
      .where(
        and(
          eq(contact.orgId, orgId),
          or(eq(contact.emailNormalised, email), eq(contact.secondaryEmailNormalised, email)),
          isNull(contact.deletedAt),
          isNull(contact.mergedIntoId),
        ),
      )
      .limit(1);
    if (existing) return existing.id;
  }

  const phones = [phoneE164, secondaryPhoneE164].filter(Boolean) as string[];
  for (const phone of phones) {
    const [existing] = await tx
      .select({ id: contact.id })
      .from(contact)
      .where(
        and(
          eq(contact.orgId, orgId),
          or(eq(contact.phoneE164, phone), eq(contact.secondaryPhoneE164, phone)),
          isNull(contact.deletedAt),
          isNull(contact.mergedIntoId),
        ),
      )
      .limit(1);
    if (existing) return existing.id;
  }

  return null;
}

export async function createContact(
  tx: DbTransaction,
  session: TenantSession,
  raw: CreateContactInput,
): Promise<CreateContactResult> {
  const input = createContactSchema.parse(raw);
  assertCan(session, 'contact.create');

  const ownerId = input.ownerId ?? session.userId;
  if (session.role === 'member' && ownerId !== session.userId) {
    throw new ForbiddenError('Members can only assign contacts to themselves.');
  }

  const email = input.email?.trim() || null;
  const emailNormalised = normaliseEmail(email);
  const phoneE164 = normalisePhone(input.phone);
  const phoneType = detectPhoneType(phoneE164);
  const secondaryEmail = input.secondaryEmail?.trim() || null;
  const secondaryEmailNormalised = normaliseEmail(secondaryEmail);
  const secondaryPhoneE164 = normalisePhone(input.secondaryPhone);

  if (!input.forceCreate) {
    const duplicateId = await findExistingByEmailOrPhone(
      tx,
      session.orgId,
      emailNormalised,
      phoneE164,
      secondaryEmailNormalised,
      secondaryPhoneE164,
    );
    if (duplicateId) {
      throw new DuplicateContactError(duplicateId);
    }
  }

  const suppression = await findSuppressionMatch(tx, session.orgId, email, phoneE164);
  const dobEnabled = await collectContactDateOfBirth(tx, session.orgId);
  const dateOfBirth =
    dobEnabled && input.dateOfBirth?.trim() ? input.dateOfBirth.trim() : null;

  const now = new Date();
  let resolvedCompanyId = input.companyId ?? null;

  if (!resolvedCompanyId && input.newCompany) {
    const companyPayload = createCompanySchema.parse({
      name: input.newCompany.name,
      website: input.newCompany.website ?? '',
      ownerId,
    });
    const created = await createCompany(tx, session, companyPayload);
    resolvedCompanyId = created.id;
  }

  const nameFields = {
    firstName: input.firstName || '',
    lastName: input.lastName || '',
    email,
    phoneE164,
  };

  const anyMarketingGranted = INBOUND_CHANNELS.some(
    (channel) => input.consent?.channels?.[channel]?.marketingConsent === 'granted',
  );

  const [row] = await tx
    .insert(contact)
    .values({
      orgId: session.orgId,
      displayName: displayName(nameFields),
      firstName: nameFields.firstName,
      lastName: nameFields.lastName,
      email,
      emailNormalised,
      emailVerified: false,
      phoneE164,
      phoneType,
      secondaryEmail,
      secondaryEmailNormalised,
      secondaryPhoneE164,
      jobTitle: input.jobTitle?.trim() || null,
      companyId: resolvedCompanyId,
      ownerId,
      source: input.source ?? 'Manual',
      campaign: input.campaign?.trim() || null,
      recipientType: input.recipientType ?? 'individual',
      lifecycle: input.lifecycle ?? 'lead',
      socialUrl: input.linkedinUrl?.trim()
        ? normaliseLinkedInProfileUrl(input.linkedinUrl)
        : null,
      addressLine1: input.addressLine1?.trim() || null,
      addressLine2: input.addressLine2?.trim() || null,
      city: input.city?.trim() || null,
      postcode: input.postcode?.trim() || null,
      country: input.country?.trim() || 'GB',
      dateOfBirth: dateOfBirth || null,
      marketingConsent: anyMarketingGranted || input.marketingConsent === true,
      lastActivityAt: now,
      createdBy: session.userId,
      updatedBy: session.userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: contact.id });

  const contactId = row!.id;

  if (suppression) {
    for (const channel of INBOUND_CHANNELS) {
      await tx.insert(contactConsent).values({
        orgId: session.orgId,
        contactId,
        channel,
        dnd: true,
        marketingConsent: 'denied',
        source: 'suppression',
        wording: suppression.reason,
        updatedAt: now,
        updatedBy: session.userId,
      });
    }
  } else if (input.consent?.channels) {
    const consentSource = input.consent.source ?? null;
    const consentWording = input.consent.wording?.trim() || null;
    for (const channel of INBOUND_CHANNELS) {
      const rowConsent = input.consent.channels[channel];
      const marketingConsent = rowConsent?.marketingConsent ?? 'unknown';
      const dnd = rowConsent?.dnd ?? false;
      await tx.insert(contactConsent).values({
        orgId: session.orgId,
        contactId,
        channel,
        dnd,
        marketingConsent,
        source: marketingConsent === 'granted' ? consentSource : null,
        wording: marketingConsent === 'granted' ? consentWording : null,
        updatedAt: now,
        updatedBy: session.userId,
      });
      if (dnd) {
        await tx.insert(contactConsentHistory).values({
          orgId: session.orgId,
          contactId,
          channel,
          dnd: true,
          marketingConsent,
          reason: rowConsent?.dndReason?.trim() || null,
          changedAt: now,
          changedBy: session.userId,
        });
      }
    }
  }

  if (input.campaign?.trim()) {
    await tx.insert(attribution).values({
      orgId: session.orgId,
      contactId,
      touch: 'first',
      campaign: input.campaign.trim(),
      capturedAt: now,
    });
  }

  for (const tagId of input.tagIds ?? []) {
    await tx.insert(contactTag).values({
      contactId,
      tagId,
      orgId: session.orgId,
    });
  }

  for (const userId of input.followerIds ?? []) {
    await tx.insert(contactFollower).values({
      orgId: session.orgId,
      contactId,
      userId,
      createdBy: session.userId,
    });
  }

  if (input.note?.trim()) {
    await tx.insert(contactNote).values({
      orgId: session.orgId,
      contactId,
      body: input.note.trim(),
      createdBy: session.userId,
      updatedBy: session.userId,
      createdAt: now,
      updatedAt: now,
    });
  }

  const auditInput = {
    orgId: session.orgId,
    actorType: 'user' as const,
    actorId: session.userId,
    action: 'contact.created' as const,
    entityType: 'contact',
    entityId: contactId,
    changes: { created: { to: true } },
  };
  if (suppression) {
    await writeAudit(tx, { ...auditInput, metadata: { suppressionApplied: true } });
  } else {
    await writeAudit(tx, auditInput);
  }

  let linkedCompanyId = resolvedCompanyId;
  const autoLinkEnabled = await isAutoLinkContactsByEmailDomain(tx, session.orgId);
  if (!linkedCompanyId && emailNormalised && autoLinkEnabled) {
    linkedCompanyId = await findCompanyIdByEmailDomain(tx, session.orgId, emailNormalised);
    if (linkedCompanyId) {
      await tx
        .update(contact)
        .set({ companyId: linkedCompanyId, updatedAt: now, updatedBy: session.userId })
        .where(eq(contact.id, contactId));
    }
  }

  if (linkedCompanyId) {
    await syncContactCompanyFromPrimary(tx, session.orgId, contactId, linkedCompanyId);
    await refreshCompanyContactCount(tx, session.orgId, linkedCompanyId);
  }

  let opportunityId: string | null = null;
  if (input.newOpportunity) {
    const dealName =
      input.newOpportunity.name?.trim() ||
      `${displayName(nameFields)} · Pipeline`;
    const createdDeal = await createOpportunity(tx, session, {
      contactId,
      companyId: linkedCompanyId ?? undefined,
      pipelineId: input.newOpportunity.pipelineId,
      stageId: input.newOpportunity.stageId,
      name: dealName,
      valueGbp: input.newOpportunity.valueGbp ?? '',
      ownerId,
      expectedCloseDate: input.newOpportunity.expectedCloseDate || undefined,
      source: input.source ?? 'Manual',
      campaign: input.campaign?.trim() || undefined,
    });
    opportunityId = createdDeal.id;
  }

  await ensureConversationForContact(tx, session, contactId);

  return {
    id: contactId,
    companyId: linkedCompanyId,
    opportunityId,
    ...(suppression
      ? { suppressionWarning: true as const, suppressionReason: suppression.reason }
      : {}),
  };
}
