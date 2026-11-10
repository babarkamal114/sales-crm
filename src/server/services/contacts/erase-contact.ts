import 'server-only';

import { eq } from 'drizzle-orm';
import type { eraseContactSchema } from '@/domain/contacts/mutation-schemas';
import {
  suppressionEmailHash,
  suppressionPhoneHash,
} from '@/domain/contacts/suppression';
import type { z } from 'zod';
import { ForbiddenError } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import { contact, suppression } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { requireContact } from '@/server/services/contacts/contact-access';

type Input = z.infer<typeof eraseContactSchema>;

export async function eraseContact(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ id: string }> {
  const row = await requireContact(tx, session, input.contactId, 'contact.restrict');

  if (row.displayName.trim() !== input.confirmDisplayName.trim()) {
    throw new ForbiddenError('Confirmation name does not match this contact.');
  }

  const now = new Date();
  const emailHash = suppressionEmailHash(row.email);
  const phoneHash = suppressionPhoneHash(row.phoneE164);

  if (emailHash || phoneHash) {
    await tx.insert(suppression).values({
      orgId: session.orgId,
      emailHash,
      phoneHash,
      reason: input.reason ?? 'Contact erasure (GDPR)',
    });
  }

  await tx
    .update(contact)
    .set({
      displayName: 'Erased contact',
      firstName: 'Erased',
      lastName: 'Contact',
      email: null,
      emailNormalised: null,
      phoneE164: null,
      phoneType: null,
      jobTitle: null,
      socialUrl: null,
      avatarKey: null,
      deletedAt: now,
      restricted: true,
      version: row.version + 1,
      updatedAt: now,
      updatedBy: session.userId,
    })
    .where(eq(contact.id, row.id));

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'contact.erased',
    entityType: 'contact',
    entityId: row.id,
    changes: { erased: { to: true } },
    metadata: { reason: input.reason ?? null },
  });

  return { id: row.id };
}
