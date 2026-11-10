import 'server-only';

import { and, desc, eq, isNull } from 'drizzle-orm';
import { canContactSummary } from '@/domain/contacts/consent';
import { assertCan, NotFoundError } from '@/server/access/capabilities';
import {
  attribution,
  company,
  contact,
  contactConsent,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export type ContactDealPrefill = {
  contactId: string;
  displayName: string;
  companyId: string | null;
  companyName: string | null;
  source: string | null;
  campaign: string | null;
  canContact: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    call: boolean;
  };
};

export async function getContactDealPrefill(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
): Promise<ContactDealPrefill> {
  assertCan(session, 'contact.view');

  const [row] = await tx
    .select({
      contact,
      companyName: company.name,
    })
    .from(contact)
    .leftJoin(company, eq(contact.companyId, company.id))
    .where(
      and(eq(contact.orgId, session.orgId), eq(contact.id, contactId), isNull(contact.deletedAt)),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError('Contact not found.');
  }

  const consentRows = await tx
    .select()
    .from(contactConsent)
    .where(
      and(eq(contactConsent.orgId, session.orgId), eq(contactConsent.contactId, contactId)),
    );

  const summary = canContactSummary(row.contact, consentRows);

  const [firstTouch] = await tx
    .select({ source: attribution.source, campaign: attribution.campaign })
    .from(attribution)
    .where(and(eq(attribution.orgId, session.orgId), eq(attribution.contactId, contactId)))
    .orderBy(desc(attribution.capturedAt))
    .limit(1);

  const contactSource = row.contact.source?.trim() || null;

  return {
    contactId,
    displayName: row.contact.displayName,
    companyId: row.contact.companyId,
    companyName: row.companyName,
    source: contactSource ?? firstTouch?.source ?? null,
    campaign: row.contact.campaign?.trim() || firstTouch?.campaign || null,
    canContact: {
      email: summary.email.allowed,
      sms: summary.sms.allowed,
      whatsapp: summary.whatsapp.allowed,
      call: summary.call.allowed,
    },
  };
}
