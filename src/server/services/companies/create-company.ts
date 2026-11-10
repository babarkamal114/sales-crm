import 'server-only';

import { and, eq, isNull, ne } from 'drizzle-orm';
import { normaliseCompanyName } from '@/domain/companies/normalise-company-name';
import type { CompanyLifecycle } from '@/domain/companies/lifecycle';
import type { CreateCompanyPayload } from '@/domain/companies/schemas';
import { assertCan } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import {
  company,
  companyDomain,
  companyFollower,
  companyStats,
  companyTag,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export class CompanyConflictError extends Error {
  readonly code = 'CONFLICT' as const;

  constructor(
    message: string,
    readonly existingCompanyId: string,
    readonly field: 'domain' | 'companies_house',
  ) {
    super(message);
    this.name = 'CompanyConflictError';
  }
}

function isManagerRole(role: TenantSession['role']): boolean {
  return role === 'admin' || role === 'manager';
}

export async function createCompany(
  tx: DbTransaction,
  session: TenantSession,
  input: CreateCompanyPayload,
): Promise<{ id: string }> {
  assertCan(session, 'contact.create');

  const name = input.name.trim();
  const domainNormalised = input.websiteDomain;
  const domain = domainNormalised ?? (input.website?.trim() || null);

  const ownerId =
    isManagerRole(session.role) && input.ownerId ? input.ownerId : session.userId;

  if (domainNormalised) {
    const [domainClash] = await tx
      .select({ id: company.id, name: company.name })
      .from(company)
      .where(
        and(
          eq(company.orgId, session.orgId),
          eq(company.domainNormalised, domainNormalised),
          isNull(company.deletedAt),
        ),
      )
      .limit(1);
    if (domainClash && !input.forceCreate) {
      throw new CompanyConflictError(
        `The domain ${domainNormalised} already belongs to ${domainClash.name}.`,
        domainClash.id,
        'domain',
      );
    }
  }

  const ch = input.companiesHouseNumber?.trim();
  if (ch) {
    const [chClash] = await tx
      .select({ id: company.id, name: company.name })
      .from(company)
      .where(
        and(
          eq(company.orgId, session.orgId),
          eq(company.companiesHouseNumber, ch),
          isNull(company.deletedAt),
        ),
      )
      .limit(1);
    if (chClash && !input.forceCreate) {
      throw new CompanyConflictError(
        `Companies House number ${ch} is already on ${chClash.name}.`,
        chClash.id,
        'companies_house',
      );
    }
  }

  if (input.parentCompanyId) {
    const [parent] = await tx
      .select({ id: company.id })
      .from(company)
      .where(
        and(
          eq(company.orgId, session.orgId),
          eq(company.id, input.parentCompanyId),
          isNull(company.deletedAt),
        ),
      )
      .limit(1);
    if (!parent) {
      throw new Error('Parent company not found.');
    }
  }

  const lifecycle = (input.lifecycle ?? 'prospect') as CompanyLifecycle;
  const lifecycleSource = lifecycle === 'prospect' ? 'derived' : 'manual';

  const [row] = await tx
    .insert(company)
    .values({
      orgId: session.orgId,
      name,
      nameNormalised: normaliseCompanyName(name),
      domain,
      domainNormalised,
      websiteUrl: input.website?.trim() || null,
      phoneE164: input.phone || null,
      addressLine1: input.addressLine1?.trim() || null,
      addressLine2: input.addressLine2?.trim() || null,
      city: input.city?.trim() || null,
      postcode: input.postcode?.trim() || null,
      country: input.country?.trim() || 'GB',
      industry: input.industry?.trim() || null,
      sizeBand: input.sizeBand?.trim() || null,
      companiesHouseNumber: ch || null,
      description: input.description?.trim() || null,
      linkedinUrl: input.linkedinUrl?.trim() || null,
      parentCompanyId: input.parentCompanyId ?? null,
      ownerId,
      lifecycle,
      lifecycleSource,
      recipientType: input.recipientType ?? 'corporate',
      createdBy: session.userId,
      updatedBy: session.userId,
    })
    .returning({ id: company.id });

  const companyId = row!.id;

  await tx.insert(companyStats).values({
    companyId,
    orgId: session.orgId,
  });

  const domainRows = new Map<string, boolean>();
  if (domainNormalised) {
    domainRows.set(domainNormalised, true);
  }
  for (const extra of input.extraDomainsNormalised) {
    if (!domainRows.has(extra)) {
      domainRows.set(extra, domainRows.size === 0);
    }
  }

  for (const [domainKey, isPrimary] of domainRows) {
    const [taken] = await tx
      .select({ id: companyDomain.id, companyId: companyDomain.companyId })
      .from(companyDomain)
      .innerJoin(company, eq(companyDomain.companyId, company.id))
      .where(
        and(
          eq(companyDomain.orgId, session.orgId),
          eq(companyDomain.domainNormalised, domainKey),
          isNull(company.deletedAt),
          ne(company.id, companyId),
        ),
      )
      .limit(1);
    if (taken) {
      throw new CompanyConflictError(
        `The domain ${domainKey} is already registered to another company.`,
        taken.companyId,
        'domain',
      );
    }

    await tx.insert(companyDomain).values({
      orgId: session.orgId,
      companyId,
      domainNormalised: domainKey,
      isPrimary,
      createdBy: session.userId,
    });
  }

  for (const tagId of input.tagIds ?? []) {
    await tx.insert(companyTag).values({
      orgId: session.orgId,
      companyId,
      tagId,
    });
  }

  const followerSet = new Set(input.followerIds ?? []);
  followerSet.add(session.userId);
  for (const userId of followerSet) {
    await tx.insert(companyFollower).values({
      orgId: session.orgId,
      companyId,
      userId,
      createdBy: session.userId,
    });
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'company.created',
    entityType: 'company',
    entityId: companyId,
    changes: { name: { to: name } },
  });

  return { id: companyId };
}
