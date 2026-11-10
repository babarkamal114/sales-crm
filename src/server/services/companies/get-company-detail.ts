import 'server-only';

import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { NotFoundError } from '@/server/access/capabilities';
import type { CompanyDetail } from '@/domain/companies/detail-view';
import { displayName } from '@/domain/contacts/display-name';
import type { AuditAction } from '@/domain/audit/actions';
import {
  auditLog,
  company,
  companyDomain,
  companyTag,
  contact,
  opportunity,
  pipelineStage,
  tag,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { getCompanyQuickView } from '@/server/services/companies/get-company-quick-view';

const AUDIT_LABELS: Partial<Record<AuditAction, string>> = {
  'company.created': 'Company created',
  'company.updated': 'Company updated',
  'company.deleted': 'Company deleted',
  'company.owner_changed': 'Owner changed',
  'company.tags_changed': 'Tags updated',
  'company.merged': 'Company merged',
  'company.export_requested': 'Export requested',
  'company.bulk_action': 'Bulk action',
};

function auditLabel(action: string): string {
  return AUDIT_LABELS[action as AuditAction] ?? action.replace(/^company\./, 'Company ').replace(/_/g, ' ');
}

export async function getCompanyDetail(
  tx: DbTransaction,
  session: TenantSession,
  companyId: string,
): Promise<CompanyDetail> {
  const quick = await getCompanyQuickView(tx, session, companyId);

  const [row] = await tx
    .select()
    .from(company)
    .where(
      and(eq(company.orgId, session.orgId), eq(company.id, companyId), isNull(company.deletedAt)),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError('Company not found.');
  }

  const [tagRows, domainRows, auditRows, oppRows, parentRow] = await Promise.all([
    tx
      .select({
        id: tag.id,
        name: tag.name,
        colourKey: tag.colourKey,
      })
      .from(companyTag)
      .innerJoin(tag, eq(companyTag.tagId, tag.id))
      .where(and(eq(companyTag.orgId, session.orgId), eq(companyTag.companyId, companyId))),
    tx
      .select({
        domainNormalised: companyDomain.domainNormalised,
        isPrimary: companyDomain.isPrimary,
      })
      .from(companyDomain)
      .where(and(eq(companyDomain.orgId, session.orgId), eq(companyDomain.companyId, companyId)))
      .orderBy(desc(companyDomain.isPrimary)),
    tx
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
          eq(auditLog.entityId, companyId),
        ),
      )
      .orderBy(desc(auditLog.occurredAt))
      .limit(12),
    tx
      .select({
        id: opportunity.id,
        name: opportunity.name,
        valuePence: opportunity.valuePence,
        status: opportunity.status,
        stageName: pipelineStage.name,
        contactFirst: contact.firstName,
        contactLast: contact.lastName,
        contactEmail: contact.email,
      })
      .from(opportunity)
      .innerJoin(pipelineStage, eq(opportunity.stageId, pipelineStage.id))
      .innerJoin(contact, eq(opportunity.contactId, contact.id))
      .where(
        and(
          eq(opportunity.orgId, session.orgId),
          isNull(opportunity.deletedAt),
          or(
            eq(opportunity.companyId, companyId),
            eq(contact.companyId, companyId),
            sql`${contact.id} in (
              select cc.contact_id from crm.contact_company cc
              where cc.company_id = ${companyId} and cc.org_id = ${session.orgId}
            )`,
          ),
        ),
      )
      .orderBy(desc(opportunity.updatedAt))
      .limit(50),
    row.parentCompanyId
      ? tx
          .select({ id: company.id, name: company.name })
          .from(company)
          .where(
            and(
              eq(company.orgId, session.orgId),
              eq(company.id, row.parentCompanyId),
              isNull(company.deletedAt),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  const recentActivity = auditRows.map((entry) => ({
    id: entry.id,
    label: auditLabel(entry.action),
    at: entry.occurredAt.toISOString(),
  }));

  const parent = parentRow[0];

  return {
    id: quick.id,
    version: quick.version,
    displayName: quick.displayName,
    name: quick.name,
    domain: quick.domain,
    websiteUrl: quick.websiteUrl,
    industry: quick.industry,
    city: quick.city,
    sizeBand: quick.sizeBand,
    lifecycle: quick.lifecycle,
    lifecycleSource: quick.lifecycleSource,
    owner: quick.owner,
    openPipelineValuePence: quick.openPipelineValuePence,
    wonValueTotalPence: quick.wonValueTotalPence,
    contactCount: quick.contactCount,
    lastActivityAt: quick.lastActivityAt,
    createdAt: quick.createdAt,
    phoneE164: quick.phoneE164,
    companiesHouseNumber: quick.companiesHouseNumber,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    postcode: row.postcode,
    country: row.country,
    description: row.description,
    linkedinUrl: row.linkedinUrl,
    recipientType: row.recipientType,
    tags: tagRows,
    extraDomains: domainRows,
    parentCompany: parent ? { id: parent.id, name: parent.name } : null,
    contacts: quick.contacts,
    opportunities: oppRows.map((deal) => ({
      id: deal.id,
      name: deal.name,
      valuePence: deal.valuePence,
      stageName: deal.stageName,
      status: deal.status,
      contactName: displayName({
        firstName: deal.contactFirst,
        lastName: deal.contactLast,
        email: deal.contactEmail,
        phoneE164: null,
      }),
    })),
    recentActivity,
    duplicate: quick.duplicate,
  };
}
