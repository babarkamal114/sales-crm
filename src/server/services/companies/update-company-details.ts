import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';
import type { updateCompanyDetailsSchema } from '@/domain/companies/schemas';
import { normaliseCompanyName } from '@/domain/companies/normalise-company-name';
import type { z } from 'zod';
import { ForbiddenError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import { company, companyTag, membership, tag } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  assertCompanyVersion,
  CompanyVersionConflictError,
  requireCompany,
} from '@/server/services/companies/company-access';

type Input = z.infer<typeof updateCompanyDetailsSchema>;

export async function updateCompanyDetails(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ id: string; version: number }> {
  const existing = await requireCompany(tx, session, input.companyId, 'contact.update');
  assertCompanyVersion(existing, input.version);

  if (session.role === 'member' && input.ownerId !== session.userId) {
    throw new ForbiddenError('Members can only assign themselves as owner.');
  }

  const [member] = await tx
    .select({ userId: membership.userId })
    .from(membership)
    .where(and(eq(membership.orgId, session.orgId), eq(membership.userId, input.ownerId)))
    .limit(1);

  if (!member) {
    throw new ForbiddenError('Owner must be a member of this organisation.');
  }

  const uniqueTagIds = [...new Set(input.tagIds)];
  if (uniqueTagIds.length > 0) {
    const tags = await tx
      .select({ id: tag.id })
      .from(tag)
      .where(and(eq(tag.orgId, session.orgId), inArray(tag.id, uniqueTagIds)));
    if (tags.length !== uniqueTagIds.length) {
      throw new Error('One or more tags were not found.');
    }
  }

  const now = new Date();
  const lifecycleChanged = input.lifecycle !== existing.lifecycle;
  const domainNormalised = input.websiteDomain;

  const [updated] = await tx
    .update(company)
    .set({
      name: input.name,
      nameNormalised: normaliseCompanyName(input.name),
      domain: domainNormalised ?? existing.domain,
      domainNormalised: domainNormalised ?? existing.domainNormalised,
      websiteUrl: input.website?.trim() || null,
      phoneE164: input.phone || null,
      industry: input.industry?.trim() || null,
      sizeBand: input.sizeBand ?? null,
      ownerId: input.ownerId,
      lifecycle: input.lifecycle as typeof existing.lifecycle,
      lifecycleSource: lifecycleChanged ? 'manual' : existing.lifecycleSource,
      addressLine1: input.addressLine1?.trim() || null,
      addressLine2: input.addressLine2?.trim() || null,
      city: input.city?.trim() || null,
      postcode: input.postcode?.trim() || null,
      country: (input.country || 'GB').slice(0, 2).toUpperCase(),
      companiesHouseNumber: input.companiesHouseNumber || null,
      linkedinUrl: input.linkedinUrl?.trim() || null,
      description: input.description?.trim() || null,
      version: existing.version + 1,
      updatedAt: now,
      updatedBy: session.userId,
      lastActivityAt: now,
    })
    .where(and(eq(company.id, existing.id), eq(company.version, existing.version)))
    .returning({ id: company.id, version: company.version });

  if (!updated) {
    throw new CompanyVersionConflictError();
  }

  const currentTags = await tx
    .select({ tagId: companyTag.tagId })
    .from(companyTag)
    .where(and(eq(companyTag.orgId, session.orgId), eq(companyTag.companyId, existing.id)));

  const currentIds = new Set(currentTags.map((t) => t.tagId));
  const targetIds = new Set(uniqueTagIds);
  const toRemove = [...currentIds].filter((id) => !targetIds.has(id));
  const toAdd = uniqueTagIds.filter((id) => !currentIds.has(id));

  if (toRemove.length > 0) {
    await tx
      .delete(companyTag)
      .where(
        and(
          eq(companyTag.orgId, session.orgId),
          eq(companyTag.companyId, existing.id),
          inArray(companyTag.tagId, toRemove),
        ),
      );
  }

  if (toAdd.length > 0) {
    await tx.insert(companyTag).values(
      toAdd.map((tagId) => ({
        orgId: session.orgId,
        companyId: existing.id,
        tagId,
      })),
    );
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'company.updated',
    entityType: 'company',
    entityId: existing.id,
    changes: { source: { to: 'edit_modal' } },
  });

  return updated;
}
