import 'server-only';

import { and, desc, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import type { AuditAction } from '@/domain/audit/actions';
import { canContactSummary } from '@/domain/contacts/consent';
import { displayName } from '@/domain/contacts/display-name';
import { companyDisplayName } from '@/domain/companies/display-name';
import type { CompanyQuickView } from '@/domain/companies/quick-view';
import { assertCan, NotFoundError } from '@/server/access/capabilities';
import {
  auditLog,
  company,
  companyStats,
  contact,
  contactCompany,
  contactConsent,
  opportunity,
  pipelineStage,
  user,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { companyContactsFilter } from '@/server/services/companies/contact-company-link';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export async function getCompanyQuickView(
  tx: DbTransaction,
  session: TenantSession,
  companyId: string,
): Promise<CompanyQuickView> {
  assertCan(session, 'contact.view');

  const [row] = await tx
    .select({
      company,
      ownerName: user.fullName,
      stats: companyStats,
    })
    .from(company)
    .innerJoin(user, eq(company.ownerId, user.id))
    .leftJoin(companyStats, eq(companyStats.companyId, company.id))
    .where(
      and(eq(company.orgId, session.orgId), eq(company.id, companyId), isNull(company.deletedAt)),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError('Company not found.');
  }

  const c = row.company;
  const ownerDisplay = row.ownerName?.trim() || 'User';

  const contactRows = await tx
    .select({
      contact,
      linkIsPrimary: contactCompany.isPrimary,
      linkRole: contactCompany.role,
    })
    .from(contact)
    .leftJoin(
      contactCompany,
      and(
        eq(contactCompany.contactId, contact.id),
        eq(contactCompany.companyId, c.id),
        eq(contactCompany.orgId, session.orgId),
      ),
    )
    .where(companyContactsFilter(session.orgId, c.id))
    .orderBy(desc(contact.updatedAt))
    .limit(20);

  const contactIds = contactRows.map((r) => r.contact.id);
  const consentRows =
    contactIds.length === 0
      ? []
      : await tx
          .select()
          .from(contactConsent)
          .where(
            and(
              eq(contactConsent.orgId, session.orgId),
              inArray(contactConsent.contactId, contactIds),
            ),
          );

  const consentByContact = new Map<string, (typeof contactConsent.$inferSelect)[]>();
  for (const consent of consentRows) {
    const list = consentByContact.get(consent.contactId) ?? [];
    list.push(consent);
    consentByContact.set(consent.contactId, list);
  }

  const contacts: CompanyQuickView['contacts'] = contactRows.map(({ contact: person, linkIsPrimary, linkRole }) => {
    const summary = canContactSummary(person, consentByContact.get(person.id) ?? []);
    const isPrimary = linkIsPrimary ?? person.companyId === c.id;
    return {
      id: person.id,
      version: person.version,
      displayName: displayName(person),
      initials: initials(displayName(person)),
      role: linkRole ?? person.jobTitle,
      isPrimary,
      email: person.email,
      canContactEmail: summary.email.allowed,
      canContactSms: summary.sms.allowed,
      canContactCall: summary.call.allowed,
    };
  });

  const opps = await tx
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
        isNull(opportunity.deletedAt),
        contactIds.length > 0
          ? or(eq(opportunity.companyId, c.id), inArray(opportunity.contactId, contactIds))
          : eq(opportunity.companyId, c.id),
      ),
    )
    .orderBy(desc(opportunity.updatedAt))
    .limit(10);

  const auditRows = await tx
    .select({
      id: auditLog.id,
      action: auditLog.action,
      occurredAt: auditLog.occurredAt,
    })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.orgId, session.orgId),
        eq(auditLog.entityType, 'company'),
        eq(auditLog.entityId, c.id),
      ),
    )
    .orderBy(desc(auditLog.occurredAt))
    .limit(8);

  const auditLabels: Partial<Record<AuditAction, string>> = {
    'company.created': 'Company created',
    'company.updated': 'Company updated',
    'company.owner_changed': 'Owner changed',
    'company.tags_changed': 'Tags updated',
    'company.merged': 'Company merged',
  };

  const recentActivity = auditRows.map((entry) => ({
    id: entry.id,
    label:
      auditLabels[entry.action as AuditAction] ??
      entry.action.replace(/^company\./, 'Company ').replace(/_/g, ' '),
    at: entry.occurredAt.toISOString(),
  }));

  let duplicate: CompanyQuickView['duplicate'] = null;
  if (c.domainNormalised) {
    const [match] = await tx
      .select({ id: company.id, name: company.name, domain: company.domain })
      .from(company)
      .where(
        and(
          eq(company.orgId, session.orgId),
          eq(company.domainNormalised, c.domainNormalised),
          ne(company.id, c.id),
          isNull(company.deletedAt),
        ),
      )
      .limit(1);
    if (match) {
      duplicate = {
        id: match.id,
        name: match.name,
        domain: match.domain,
        strength: 'strong',
      };
    }
  }

  return {
    id: c.id,
    version: c.version,
    displayName: companyDisplayName(c),
    name: c.name,
    domain: c.domain,
    websiteUrl: c.websiteUrl,
    industry: c.industry,
    city: c.city,
    sizeBand: c.sizeBand,
    lifecycle: c.lifecycle,
    lifecycleSource: c.lifecycleSource,
    owner: {
      id: c.ownerId,
      fullName: ownerDisplay,
      initials: initials(ownerDisplay),
    },
    openPipelineValuePence: row.stats?.openPipelineValue ?? 0,
    wonValueTotalPence: row.stats?.wonValueTotal ?? 0,
    contactCount: row.stats?.contactCount ?? contacts.length,
    lastActivityAt: c.lastActivityAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    phoneE164: c.phoneE164,
    companiesHouseNumber: c.companiesHouseNumber,
    contacts,
    opportunities: opps.map((o) => ({
      id: o.id,
      name: o.name,
      valuePence: o.valuePence,
      stageName: o.stageName,
      status: o.status,
    })),
    recentActivity,
    duplicate,
  };
}
