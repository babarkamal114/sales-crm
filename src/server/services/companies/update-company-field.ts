import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import { normaliseCompaniesHouseNumber } from '@/domain/companies/companies-house-number';
import { normaliseCompanyName } from '@/domain/companies/normalise-company-name';
import { normaliseDomain } from '@/domain/companies/normalise-domain';
import type { updateCompanyFieldSchema } from '@/domain/companies/schemas';
import { normalisePhone } from '@/domain/contacts/normalise';
import type { z } from 'zod';
import { assertCan, NotFoundError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import { company } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { CompanyVersionConflictError } from '@/server/services/companies/company-access';

type Input = z.infer<typeof updateCompanyFieldSchema>;

export { CompanyVersionConflictError };

export async function updateCompanyField(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ id: string; version: number }> {
  assertCan(session, 'contact.update');

  const [existing] = await tx
    .select()
    .from(company)
    .where(
      and(
        eq(company.orgId, session.orgId),
        eq(company.id, input.companyId),
        isNull(company.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError('Company not found.');
  }

  if (existing.version !== input.version) {
    throw new CompanyVersionConflictError();
  }

  const patch: Partial<typeof existing> = {
    version: existing.version + 1,
    updatedAt: new Date(),
    updatedBy: session.userId,
    lastActivityAt: new Date(),
  };

  let auditFrom: unknown = null;
  let auditTo: unknown = input.value;

  switch (input.field) {
    case 'name': {
      const next = (input.value ?? '').trim();
      auditFrom = existing.name;
      patch.name = next;
      patch.nameNormalised = normaliseCompanyName(next);
      auditTo = next;
      break;
    }
    case 'domain': {
      const domainNormalised = normaliseDomain(input.value);
      auditFrom = existing.domain;
      patch.domain = domainNormalised ?? (input.value?.trim() || null);
      patch.domainNormalised = domainNormalised;
      auditTo = patch.domain;
      break;
    }
    case 'websiteUrl': {
      const domainNormalised = input.value ? normaliseDomain(input.value) : null;
      auditFrom = existing.websiteUrl;
      patch.websiteUrl = input.value?.trim() || null;
      if (domainNormalised && !existing.domainNormalised) {
        patch.domain = domainNormalised;
        patch.domainNormalised = domainNormalised;
      }
      break;
    }
    case 'phone': {
      const raw = input.value?.trim() || '';
      auditFrom = existing.phoneE164;
      patch.phoneE164 = raw ? (normalisePhone(raw) ?? raw) : null;
      auditTo = patch.phoneE164;
      break;
    }
    case 'addressLine1':
      auditFrom = existing.addressLine1;
      patch.addressLine1 = input.value?.trim() || null;
      break;
    case 'addressLine2':
      auditFrom = existing.addressLine2;
      patch.addressLine2 = input.value?.trim() || null;
      break;
    case 'city':
      auditFrom = existing.city;
      patch.city = input.value?.trim() || null;
      break;
    case 'postcode':
      auditFrom = existing.postcode;
      patch.postcode = input.value?.trim() || null;
      break;
    case 'country':
      auditFrom = existing.country;
      patch.country = (input.value?.trim() || 'GB').slice(0, 2).toUpperCase();
      auditTo = patch.country;
      break;
    case 'industry':
      auditFrom = existing.industry;
      patch.industry = input.value?.trim() || null;
      break;
    case 'sizeBand':
      auditFrom = existing.sizeBand;
      patch.sizeBand = input.value?.trim() || null;
      break;
    case 'description':
      auditFrom = existing.description;
      patch.description = input.value?.trim() || null;
      break;
    case 'linkedinUrl':
      auditFrom = existing.linkedinUrl;
      patch.linkedinUrl = input.value?.trim() || null;
      break;
    case 'companiesHouseNumber': {
      auditFrom = existing.companiesHouseNumber;
      const raw = input.value?.trim() || '';
      patch.companiesHouseNumber = raw ? normaliseCompaniesHouseNumber(raw) : null;
      auditTo = patch.companiesHouseNumber;
      break;
    }
    case 'lifecycle': {
      const next = (input.value ?? 'prospect') as typeof existing.lifecycle;
      auditFrom = existing.lifecycle;
      patch.lifecycle = next;
      patch.lifecycleSource = 'manual';
      auditTo = next;
      break;
    }
  }

  const [updated] = await tx
    .update(company)
    .set(patch)
    .where(and(eq(company.id, existing.id), eq(company.version, input.version)))
    .returning({ id: company.id, version: company.version });

  if (!updated) {
    throw new CompanyVersionConflictError();
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'company.updated',
    entityType: 'company',
    entityId: existing.id,
    changes: {
      [input.field]: {
        from: auditFrom,
        to: auditTo,
      },
    },
  });

  return updated;
}
