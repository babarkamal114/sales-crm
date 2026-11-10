import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import type { createOrMatchContactSchema } from '@/domain/contacts/mutation-schemas';
import { normaliseEmail, normalisePhone } from '@/domain/contacts/normalise';
import type { z } from 'zod';
import { assertCan } from '@/server/access/capabilities';
import { contact } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { createContact } from '@/server/services/contacts/create-contact';

type Input = z.infer<typeof createOrMatchContactSchema>;

export type CreateOrMatchResult = {
  id: string;
  created: boolean;
  matchedBy: 'email' | 'phone' | null;
  suppressionWarning?: boolean;
  suppressionReason?: string;
};

export async function createOrMatchContact(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<CreateOrMatchResult> {
  assertCan(session, 'contact.create');

  const emailNormalised = normaliseEmail(input.email?.trim() || null);
  const phoneE164 = normalisePhone(input.phone);

  if (emailNormalised) {
    const [byEmail] = await tx
      .select({ id: contact.id })
      .from(contact)
      .where(
        and(
          eq(contact.orgId, session.orgId),
          eq(contact.emailNormalised, emailNormalised),
          isNull(contact.deletedAt),
          isNull(contact.mergedIntoId),
        ),
      )
      .limit(1);
    if (byEmail) {
      return { id: byEmail.id, created: false, matchedBy: 'email' };
    }
  }

  if (phoneE164) {
    const [byPhone] = await tx
      .select({ id: contact.id })
      .from(contact)
      .where(
        and(
          eq(contact.orgId, session.orgId),
          eq(contact.phoneE164, phoneE164),
          isNull(contact.deletedAt),
          isNull(contact.mergedIntoId),
        ),
      )
      .limit(1);
    if (byPhone) {
      return { id: byPhone.id, created: false, matchedBy: 'phone' };
    }
  }

  const created = await createContact(tx, session, {
    ...input,
    forceCreate: true,
  });

  const result: CreateOrMatchResult = {
    id: created.id,
    created: true,
    matchedBy: null,
  };
  if (created.suppressionWarning) {
    result.suppressionWarning = true;
    if (created.suppressionReason) {
      result.suppressionReason = created.suppressionReason;
    }
  }
  return result;
}
