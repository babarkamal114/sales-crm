import 'server-only';

import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import type { mergeCompaniesSchema } from '@/domain/companies/mutation-schemas';
import { mergeCompanies as mergeCompaniesDomain } from '@/domain/companies/merge';
import { normaliseCompanyName } from '@/domain/companies/normalise-company-name';
import { normaliseDomain } from '@/domain/companies/normalise-domain';
import type { z } from 'zod';
import { assertCan } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import {
  company,
  companyDomain,
  companyFollower,
  companyMergeLog,
  companyTag,
  contact,
  contactCompany,
  opportunity,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  assertCompanyVersion,
  CompanyVersionConflictError,
  requireCompany,
} from '@/server/services/companies/company-access';
import { refreshCompanyStats } from '@/server/services/companies/refresh-company-stats';

type Input = z.infer<typeof mergeCompaniesSchema>;

function toSnapshot(row: typeof company.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    websiteUrl: row.websiteUrl,
    phoneE164: row.phoneE164,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    postcode: row.postcode,
    country: row.country,
    industry: row.industry,
    sizeBand: row.sizeBand,
    companiesHouseNumber: row.companiesHouseNumber,
    description: row.description,
    linkedinUrl: row.linkedinUrl,
    ownerId: row.ownerId,
    lifecycle: row.lifecycle,
  };
}

export async function mergeCompanies(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ survivingId: string; mergedId: string; version: number }> {
  assertCan(session, 'contact.merge');

  if (input.primaryCompanyId === input.secondaryCompanyId) {
    throw new Error('Cannot merge a company with itself.');
  }

  const primaryRow = await requireCompany(tx, session, input.primaryCompanyId, 'contact.merge');
  const secondaryRow = await requireCompany(tx, session, input.secondaryCompanyId, 'contact.merge');

  assertCompanyVersion(primaryRow, input.primaryVersion);

  const now = new Date();

  const [contactDirectCount] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(contact)
    .where(
      and(
        eq(contact.orgId, session.orgId),
        eq(contact.companyId, secondaryRow.id),
        isNull(contact.deletedAt),
      ),
    );

  const [contactLinkCount] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(contactCompany)
    .where(
      and(eq(contactCompany.orgId, session.orgId), eq(contactCompany.companyId, secondaryRow.id)),
    );

  const [oppCount] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(opportunity)
    .where(
      and(
        eq(opportunity.orgId, session.orgId),
        eq(opportunity.companyId, secondaryRow.id),
        isNull(opportunity.deletedAt),
      ),
    );

  const [domainCount] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(companyDomain)
    .where(
      and(eq(companyDomain.orgId, session.orgId), eq(companyDomain.companyId, secondaryRow.id)),
    );

  const [tagCount] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(companyTag)
    .where(and(eq(companyTag.orgId, session.orgId), eq(companyTag.companyId, secondaryRow.id)));

  const [followerCount] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(companyFollower)
    .where(
      and(eq(companyFollower.orgId, session.orgId), eq(companyFollower.companyId, secondaryRow.id)),
    );

  const result = mergeCompaniesDomain(
    toSnapshot(primaryRow),
    toSnapshot(secondaryRow),
    input.choices ?? {},
    {
      contacts: (contactDirectCount?.count ?? 0) + (contactLinkCount?.count ?? 0),
      opportunities: oppCount?.count ?? 0,
      tasks: 0,
      notes: 0,
      documents: 0,
      domains: domainCount?.count ?? 0,
      tags: tagCount?.count ?? 0,
      followers: followerCount?.count ?? 0,
      customFieldValues: 0,
      activityEvents: 0,
    },
  );

  const domainNormalised = result.merged.domain ? normaliseDomain(result.merged.domain) : null;

  const [updatedPrimary] = await tx
    .update(company)
    .set({
      name: result.merged.name,
      nameNormalised: normaliseCompanyName(result.merged.name),
      domain: result.merged.domain,
      domainNormalised,
      websiteUrl: result.merged.websiteUrl,
      phoneE164: result.merged.phoneE164,
      addressLine1: result.merged.addressLine1,
      addressLine2: result.merged.addressLine2,
      city: result.merged.city,
      postcode: result.merged.postcode,
      country: result.merged.country,
      industry: result.merged.industry,
      sizeBand: result.merged.sizeBand,
      companiesHouseNumber: result.merged.companiesHouseNumber,
      description: result.merged.description,
      linkedinUrl: result.merged.linkedinUrl,
      ownerId: result.merged.ownerId,
      lifecycle: result.merged.lifecycle as typeof primaryRow.lifecycle,
      version: primaryRow.version + 1,
      updatedAt: now,
      updatedBy: session.userId,
      lastActivityAt: now,
    })
    .where(and(eq(company.id, primaryRow.id), eq(company.version, primaryRow.version)))
    .returning({ id: company.id, version: company.version });

  if (!updatedPrimary) {
    throw new CompanyVersionConflictError();
  }

  await tx
    .update(contact)
    .set({ companyId: primaryRow.id, updatedAt: now, updatedBy: session.userId })
    .where(
      and(
        eq(contact.orgId, session.orgId),
        eq(contact.companyId, secondaryRow.id),
        isNull(contact.deletedAt),
      ),
    );

  const secondaryLinks = await tx
    .select()
    .from(contactCompany)
    .where(
      and(eq(contactCompany.orgId, session.orgId), eq(contactCompany.companyId, secondaryRow.id)),
    );

  for (const link of secondaryLinks) {
    const [existingOnPrimary] = await tx
      .select({ id: contactCompany.id })
      .from(contactCompany)
      .where(
        and(
          eq(contactCompany.orgId, session.orgId),
          eq(contactCompany.companyId, primaryRow.id),
          eq(contactCompany.contactId, link.contactId),
        ),
      )
      .limit(1);

    if (existingOnPrimary) {
      await tx.delete(contactCompany).where(eq(contactCompany.id, link.id));
    } else {
      await tx
        .update(contactCompany)
        .set({ companyId: primaryRow.id })
        .where(eq(contactCompany.id, link.id));
    }
  }

  await tx
    .update(opportunity)
    .set({ companyId: primaryRow.id, updatedAt: now, updatedBy: session.userId })
    .where(
      and(
        eq(opportunity.orgId, session.orgId),
        eq(opportunity.companyId, secondaryRow.id),
        isNull(opportunity.deletedAt),
      ),
    );

  await tx
    .update(company)
    .set({ parentCompanyId: primaryRow.id, updatedAt: now, updatedBy: session.userId })
    .where(
      and(
        eq(company.orgId, session.orgId),
        eq(company.parentCompanyId, secondaryRow.id),
        isNull(company.deletedAt),
        ne(company.id, primaryRow.id),
        ne(company.id, secondaryRow.id),
      ),
    );

  const primaryDomains = await tx
    .select({ domainNormalised: companyDomain.domainNormalised })
    .from(companyDomain)
    .where(
      and(eq(companyDomain.orgId, session.orgId), eq(companyDomain.companyId, primaryRow.id)),
    );
  const primaryDomainSet = new Set(primaryDomains.map((d) => d.domainNormalised));

  const secondaryDomains = await tx
    .select()
    .from(companyDomain)
    .where(
      and(eq(companyDomain.orgId, session.orgId), eq(companyDomain.companyId, secondaryRow.id)),
    );

  for (const domainRow of secondaryDomains) {
    if (primaryDomainSet.has(domainRow.domainNormalised)) {
      await tx.delete(companyDomain).where(eq(companyDomain.id, domainRow.id));
    } else {
      await tx
        .update(companyDomain)
        .set({ companyId: primaryRow.id })
        .where(eq(companyDomain.id, domainRow.id));
      primaryDomainSet.add(domainRow.domainNormalised);
    }
  }

  const secondaryTags = await tx
    .select({ tagId: companyTag.tagId })
    .from(companyTag)
    .where(
      and(eq(companyTag.orgId, session.orgId), eq(companyTag.companyId, secondaryRow.id)),
    );

  const primaryTags = await tx
    .select({ tagId: companyTag.tagId })
    .from(companyTag)
    .where(and(eq(companyTag.orgId, session.orgId), eq(companyTag.companyId, primaryRow.id)));

  const primaryTagIds = new Set(primaryTags.map((t) => t.tagId));
  for (const { tagId } of secondaryTags) {
    if (!primaryTagIds.has(tagId)) {
      await tx.insert(companyTag).values({
        orgId: session.orgId,
        companyId: primaryRow.id,
        tagId,
      });
    }
  }
  await tx
    .delete(companyTag)
    .where(
      and(eq(companyTag.orgId, session.orgId), eq(companyTag.companyId, secondaryRow.id)),
    );

  const secondaryFollowers = await tx
    .select({ userId: companyFollower.userId })
    .from(companyFollower)
    .where(
      and(eq(companyFollower.orgId, session.orgId), eq(companyFollower.companyId, secondaryRow.id)),
    );

  const primaryFollowers = await tx
    .select({ userId: companyFollower.userId })
    .from(companyFollower)
    .where(
      and(eq(companyFollower.orgId, session.orgId), eq(companyFollower.companyId, primaryRow.id)),
    );

  const primaryFollowerIds = new Set(primaryFollowers.map((f) => f.userId));
  for (const { userId } of secondaryFollowers) {
    if (!primaryFollowerIds.has(userId)) {
      await tx.insert(companyFollower).values({
        orgId: session.orgId,
        companyId: primaryRow.id,
        userId,
        createdBy: session.userId,
      });
    }
  }
  await tx
    .delete(companyFollower)
    .where(
      and(
        eq(companyFollower.orgId, session.orgId),
        eq(companyFollower.companyId, secondaryRow.id),
      ),
    );

  await tx
    .update(company)
    .set({
      mergedIntoId: primaryRow.id,
      deletedAt: now,
      version: secondaryRow.version + 1,
      updatedAt: now,
      updatedBy: session.userId,
    })
    .where(eq(company.id, secondaryRow.id));

  await tx.insert(companyMergeLog).values({
    orgId: session.orgId,
    survivingId: primaryRow.id,
    mergedId: secondaryRow.id,
    fieldChoices: input.choices ?? {},
    mergedBy: session.userId,
    mergedAt: now,
  });

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'company.merged',
    entityType: 'company',
    entityId: primaryRow.id,
    changes: {
      mergedCompanyId: { to: secondaryRow.id },
      fieldChoices: { to: input.choices ?? {} },
    },
    metadata: { secondaryCompanyId: secondaryRow.id },
  });

  await refreshCompanyStats(tx, session.orgId, primaryRow.id);

  return {
    survivingId: primaryRow.id,
    mergedId: secondaryRow.id,
    version: updatedPrimary.version,
  };
}
