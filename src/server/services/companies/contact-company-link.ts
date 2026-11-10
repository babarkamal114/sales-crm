import 'server-only';

import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import { emailDomainForCompanyMatch } from '@/domain/companies/suggest-from-email';
import { NotFoundError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import {
  company,
  companyDomain,
  companyStats,
  contact,
  contactCompany,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  assertContactVersion,
  requireContact,
  touchContactActivity,
  VersionConflictError,
} from '@/server/services/contacts/contact-access';

export async function findCompanyIdByEmailDomain(
  tx: DbTransaction,
  orgId: string,
  email: string | null | undefined,
): Promise<string | null> {
  const domain = emailDomainForCompanyMatch(email);
  if (!domain) return null;

  const [byColumn] = await tx
    .select({ id: company.id })
    .from(company)
    .where(
      and(
        eq(company.orgId, orgId),
        eq(company.domainNormalised, domain),
        isNull(company.deletedAt),
      ),
    )
    .limit(1);
  if (byColumn) return byColumn.id;

  const [byDomainTable] = await tx
    .select({ companyId: companyDomain.companyId })
    .from(companyDomain)
    .innerJoin(company, eq(companyDomain.companyId, company.id))
    .where(
      and(
        eq(companyDomain.orgId, orgId),
        eq(companyDomain.domainNormalised, domain),
        isNull(company.deletedAt),
      ),
    )
    .limit(1);
  return byDomainTable?.companyId ?? null;
}

export async function refreshCompanyContactCount(
  tx: DbTransaction,
  orgId: string,
  companyId: string,
): Promise<void> {
  const countSql = sql<number>`(
    select count(distinct c.id)::int
    from crm.contact c
    left join crm.contact_company cc
      on cc.contact_id = c.id
      and cc.company_id = ${companyId}
      and cc.org_id = ${orgId}
    where c.org_id = ${orgId}
      and c.deleted_at is null
      and (c.company_id = ${companyId} or cc.id is not null)
  )`;

  const [row] = await tx
    .select({ count: countSql })
    .from(company)
    .where(and(eq(company.id, companyId), eq(company.orgId, orgId)))
    .limit(1);

  await tx
    .update(companyStats)
    .set({
      contactCount: row?.count ?? 0,
      updatedAt: new Date(),
    })
    .where(and(eq(companyStats.companyId, companyId), eq(companyStats.orgId, orgId)));
}

export type LinkContactToCompanyInput = {
  contactId: string;
  companyId: string;
  version?: number;
  isPrimary?: boolean;
  role?: string | null;
  skipVersionCheck?: boolean;
};

export async function linkContactToCompany(
  tx: DbTransaction,
  session: TenantSession,
  input: LinkContactToCompanyInput,
): Promise<{ contactId: string; version: number }> {
  const row = await requireContact(tx, session, input.contactId);
  if (!input.skipVersionCheck && input.version != null) {
    assertContactVersion(row, input.version);
  }

  const [co] = await tx
    .select({ id: company.id })
    .from(company)
    .where(
      and(
        eq(company.orgId, session.orgId),
        eq(company.id, input.companyId),
        isNull(company.deletedAt),
      ),
    )
    .limit(1);
  if (!co) {
    throw new NotFoundError('Company not found.');
  }

  const [existingLink] = await tx
    .select({ id: contactCompany.id })
    .from(contactCompany)
    .where(
      and(
        eq(contactCompany.orgId, session.orgId),
        eq(contactCompany.contactId, input.contactId),
        eq(contactCompany.companyId, input.companyId),
      ),
    )
    .limit(1);

  if (!existingLink) {
    await tx.insert(contactCompany).values({
      orgId: session.orgId,
      contactId: input.contactId,
      companyId: input.companyId,
      isPrimary: false,
      role: input.role?.trim() || null,
    });
  } else if (input.role !== undefined) {
    await tx
      .update(contactCompany)
      .set({ role: input.role?.trim() || null })
      .where(eq(contactCompany.id, existingLink.id));
  }

  const makePrimary = input.isPrimary ?? !row.companyId;
  const previousCompanyId = row.companyId;
  const now = new Date();
  let updatedVersion = row.version;

  if (makePrimary) {
    await tx
      .update(contactCompany)
      .set({ isPrimary: false })
      .where(
        and(
          eq(contactCompany.orgId, session.orgId),
          eq(contactCompany.contactId, input.contactId),
        ),
      );

    await tx
      .update(contactCompany)
      .set({ isPrimary: true })
      .where(
        and(
          eq(contactCompany.orgId, session.orgId),
          eq(contactCompany.contactId, input.contactId),
          eq(contactCompany.companyId, input.companyId),
        ),
      );

    if (row.companyId !== input.companyId) {
      const [updated] = await tx
        .update(contact)
        .set({
          companyId: input.companyId,
          version: row.version + 1,
          updatedAt: now,
          updatedBy: session.userId,
          lastActivityAt: now,
        })
        .where(and(eq(contact.id, row.id), eq(contact.version, row.version)))
        .returning({ version: contact.version });

      if (!updated && !input.skipVersionCheck) {
        throw new VersionConflictError();
      }
      updatedVersion = updated?.version ?? row.version + 1;

      await writeAudit(tx, {
        orgId: session.orgId,
        actorType: 'user',
        actorId: session.userId,
        action: 'contact.company_changed',
        entityType: 'contact',
        entityId: row.id,
        changes: { companyId: { from: previousCompanyId, to: input.companyId } },
      });
    }
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'company.updated',
    entityType: 'company',
    entityId: input.companyId,
    changes: { contactLinked: { to: input.contactId } },
  });

  await touchContactActivity(tx, session, row.id, now);
  await refreshCompanyContactCount(tx, session.orgId, input.companyId);
  if (previousCompanyId && previousCompanyId !== input.companyId) {
    await refreshCompanyContactCount(tx, session.orgId, previousCompanyId);
  }

  return { contactId: row.id, version: updatedVersion };
}

/** Contacts visible on a company (join table + legacy primary `contact.company_id`). */
export function companyContactsFilter(orgId: string, companyId: string) {
  const linked = sql`${contact.id} in (
    select contact_id from crm.contact_company
    where company_id = ${companyId} and org_id = ${orgId}
  )`;
  return and(eq(contact.orgId, orgId), isNull(contact.deletedAt), or(eq(contact.companyId, companyId), linked));
}

export async function unlinkContactFromCompany(
  tx: DbTransaction,
  session: TenantSession,
  input: { contactId: string; companyId: string; version?: number },
): Promise<{ contactId: string; version: number }> {
  const row = await requireContact(tx, session, input.contactId);
  if (input.version != null) {
    assertContactVersion(row, input.version);
  }

  const [link] = await tx
    .select({ id: contactCompany.id })
    .from(contactCompany)
    .where(
      and(
        eq(contactCompany.orgId, session.orgId),
        eq(contactCompany.contactId, input.contactId),
        eq(contactCompany.companyId, input.companyId),
      ),
    )
    .limit(1);

  const linkedOnlyViaPrimary = !link && row.companyId === input.companyId;
  if (!link && !linkedOnlyViaPrimary) {
    throw new NotFoundError('This contact is not linked to the company.');
  }

  if (link) {
    await tx.delete(contactCompany).where(eq(contactCompany.id, link.id));
  }

  const now = new Date();
  let updatedVersion = row.version;

  if (row.companyId === input.companyId) {
    const [nextPrimary] = await tx
      .select({ companyId: contactCompany.companyId, id: contactCompany.id })
      .from(contactCompany)
      .where(
        and(
          eq(contactCompany.orgId, session.orgId),
          eq(contactCompany.contactId, input.contactId),
        ),
      )
      .orderBy(desc(contactCompany.isPrimary), contactCompany.createdAt)
      .limit(1);

    const newCompanyId = nextPrimary?.companyId ?? null;

    const [updated] = await tx
      .update(contact)
      .set({
        companyId: newCompanyId,
        version: row.version + 1,
        updatedAt: now,
        updatedBy: session.userId,
        lastActivityAt: now,
      })
      .where(and(eq(contact.id, row.id), eq(contact.version, row.version)))
      .returning({ version: contact.version });

    if (!updated) {
      throw new VersionConflictError();
    }
    updatedVersion = updated.version;

    if (nextPrimary) {
      await tx
        .update(contactCompany)
        .set({ isPrimary: true })
        .where(eq(contactCompany.id, nextPrimary.id));
    }

    await writeAudit(tx, {
      orgId: session.orgId,
      actorType: 'user',
      actorId: session.userId,
      action: 'contact.company_changed',
      entityType: 'contact',
      entityId: row.id,
      changes: { companyId: { from: input.companyId, to: newCompanyId } },
    });
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'company.updated',
    entityType: 'company',
    entityId: input.companyId,
    changes: { contactUnlinked: { from: input.contactId } },
  });

  await touchContactActivity(tx, session, row.id, now);
  await refreshCompanyContactCount(tx, session.orgId, input.companyId);

  return { contactId: row.id, version: updatedVersion };
}

export async function updateContactCompanyRole(
  tx: DbTransaction,
  session: TenantSession,
  input: { contactId: string; companyId: string; role: string | null; version?: number },
): Promise<{ contactId: string; version: number }> {
  const row = await requireContact(tx, session, input.contactId);
  if (input.version != null) {
    assertContactVersion(row, input.version);
  }

  const [link] = await tx
    .select({ id: contactCompany.id })
    .from(contactCompany)
    .where(
      and(
        eq(contactCompany.orgId, session.orgId),
        eq(contactCompany.contactId, input.contactId),
        eq(contactCompany.companyId, input.companyId),
      ),
    )
    .limit(1);

  if (!link) {
    if (row.companyId !== input.companyId) {
      throw new NotFoundError('This contact is not linked to the company.');
    }
    await tx.insert(contactCompany).values({
      orgId: session.orgId,
      contactId: input.contactId,
      companyId: input.companyId,
      isPrimary: true,
      role: input.role?.trim() || null,
    });
  } else {
    await tx
      .update(contactCompany)
      .set({ role: input.role?.trim() || null })
      .where(eq(contactCompany.id, link.id));
  }

  const now = new Date();
  await touchContactActivity(tx, session, row.id, now);

  return { contactId: row.id, version: row.version };
}

export async function syncContactCompanyFromPrimary(
  tx: DbTransaction,
  orgId: string,
  contactId: string,
  companyId: string | null,
): Promise<void> {
  if (!companyId) return;
  const [existing] = await tx
    .select({ id: contactCompany.id })
    .from(contactCompany)
    .where(
      and(
        eq(contactCompany.orgId, orgId),
        eq(contactCompany.contactId, contactId),
        eq(contactCompany.companyId, companyId),
      ),
    )
    .limit(1);
  if (!existing) {
    await tx.insert(contactCompany).values({
      orgId,
      contactId,
      companyId,
      isPrimary: true,
    });
  } else {
    await tx
      .update(contactCompany)
      .set({ isPrimary: true })
      .where(eq(contactCompany.id, existing.id));
  }
}
