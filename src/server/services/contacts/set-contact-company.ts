import 'server-only';

import { and, eq } from 'drizzle-orm';
import type { setContactCompanySchema } from '@/domain/contacts/mutation-schemas';
import type { z } from 'zod';
import { writeAudit } from '@/server/audit/write';
import { contact, contactCompany } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  assertContactVersion,
  requireContact,
  touchContactActivity,
  VersionConflictError,
} from '@/server/services/contacts/contact-access';
import {
  linkContactToCompany,
  refreshCompanyContactCount,
} from '@/server/services/companies/contact-company-link';

type Input = z.infer<typeof setContactCompanySchema>;

export async function setContactCompany(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ id: string; version: number }> {
  const row = await requireContact(tx, session, input.contactId);
  assertContactVersion(row, input.version);

  if (input.companyId) {
    const linked = await linkContactToCompany(tx, session, {
      contactId: input.contactId,
      companyId: input.companyId,
      isPrimary: true,
      skipVersionCheck: true,
    });
    return { id: linked.contactId, version: linked.version };
  }

  const previousCompanyId = row.companyId;
  const now = new Date();
  const [updated] = await tx
    .update(contact)
    .set({
      companyId: null,
      version: row.version + 1,
      updatedAt: now,
      updatedBy: session.userId,
      lastActivityAt: now,
    })
    .where(and(eq(contact.id, row.id), eq(contact.version, row.version)))
    .returning({ id: contact.id, version: contact.version });

  if (!updated) {
    throw new VersionConflictError();
  }

  await tx
    .update(contactCompany)
    .set({ isPrimary: false })
    .where(
      and(eq(contactCompany.orgId, session.orgId), eq(contactCompany.contactId, row.id)),
    );

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'contact.company_changed',
    entityType: 'contact',
    entityId: row.id,
    changes: { companyId: { from: previousCompanyId, to: null } },
  });

  await touchContactActivity(tx, session, row.id, now);
  if (previousCompanyId) {
    await refreshCompanyContactCount(tx, session.orgId, previousCompanyId);
  }

  return updated;
}
