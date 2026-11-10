import 'server-only';

import { and, eq } from 'drizzle-orm';
import { displayName } from '@/domain/contacts/display-name';
import type { updateContactFieldSchema } from '@/domain/contacts/mutation-schemas';
import { normaliseEmail, normalisePhone, detectPhoneType } from '@/domain/contacts/normalise';
import type { z } from 'zod';
import { writeAudit } from '@/server/audit/write';
import { contact } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  assertContactVersion,
  requireContact,
  touchContactActivity,
  VersionConflictError,
} from '@/server/services/contacts/contact-access';
import { DuplicateContactError } from '@/server/services/contacts/create-contact';

type Input = z.infer<typeof updateContactFieldSchema>;

export async function updateContactField(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ id: string; version: number }> {
  const row = await requireContact(tx, session, input.contactId);
  assertContactVersion(row, input.version);

  const now = new Date();
  const patch: Partial<typeof row> = {
    updatedAt: now,
    updatedBy: session.userId,
    version: row.version + 1,
  };
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  const setChange = (field: string, from: unknown, to: unknown) => {
    if (from !== to) {
      changes[field] = { from, to };
    }
  };

  switch (input.field) {
    case 'firstName': {
      const value = (input.value ?? '').trim();
      if (!value) {
        throw new Error('First name is required.');
      }
      patch.firstName = value;
      setChange('firstName', row.firstName, value);
      break;
    }
    case 'lastName': {
      const value = (input.value ?? '').trim();
      patch.lastName = value;
      setChange('lastName', row.lastName, value);
      break;
    }
    case 'email': {
      const email = input.value?.trim() || null;
      const emailNormalised = normaliseEmail(email);
      if (emailNormalised) {
        const [existing] = await tx
          .select({ id: contact.id })
          .from(contact)
          .where(
            and(eq(contact.emailNormalised, emailNormalised), eq(contact.orgId, session.orgId)),
          )
          .limit(1);
        if (existing && existing.id !== row.id) {
          throw new DuplicateContactError(existing.id);
        }
      }
      patch.email = email;
      patch.emailNormalised = emailNormalised;
      setChange('email', row.email, email);
      break;
    }
    case 'phone': {
      const phoneE164 = normalisePhone(input.value ?? undefined);
      if (phoneE164) {
        const [existing] = await tx
          .select({ id: contact.id })
          .from(contact)
          .where(and(eq(contact.phoneE164, phoneE164), eq(contact.orgId, session.orgId)))
          .limit(1);
        if (existing && existing.id !== row.id) {
          throw new DuplicateContactError(existing.id);
        }
      }
      patch.phoneE164 = phoneE164;
      patch.phoneType = detectPhoneType(phoneE164);
      setChange('phoneE164', row.phoneE164, phoneE164);
      break;
    }
    case 'jobTitle': {
      const value = input.value?.trim() || null;
      patch.jobTitle = value;
      setChange('jobTitle', row.jobTitle, value);
      break;
    }
    case 'lifecycle': {
      const value = input.value as typeof row.lifecycle;
      if (!['lead', 'customer', 'former_customer', 'not_a_fit'].includes(value)) {
        throw new Error('Invalid lifecycle.');
      }
      patch.lifecycle = value;
      setChange('lifecycle', row.lifecycle, value);
      break;
    }
    case 'source': {
      const value = input.value?.trim() || null;
      patch.source = value;
      setChange('source', row.source, value);
      break;
    }
    case 'recipientType': {
      const value = input.value as typeof row.recipientType;
      if (value !== 'individual' && value !== 'corporate') {
        throw new Error('Invalid recipient type.');
      }
      patch.recipientType = value;
      setChange('recipientType', row.recipientType, value);
      break;
    }
    case 'socialUrl': {
      const value = input.value?.trim() || null;
      patch.socialUrl = value;
      setChange('socialUrl', row.socialUrl, value);
      break;
    }
    case 'campaign': {
      const value = input.value?.trim() || null;
      patch.campaign = value;
      setChange('campaign', row.campaign, value);
      break;
    }
    default:
      throw new Error('Unsupported field.');
  }

  if (changes.firstName || changes.lastName || changes.email) {
    patch.displayName = displayName({
      firstName: patch.firstName ?? row.firstName,
      lastName: patch.lastName ?? row.lastName,
      email: patch.email ?? row.email,
      phoneE164: patch.phoneE164 ?? row.phoneE164,
    });
  }

  if (Object.keys(changes).length === 0) {
    return { id: row.id, version: row.version };
  }

  patch.lastActivityAt = now;

  const [updated] = await tx
    .update(contact)
    .set(patch)
    .where(and(eq(contact.id, row.id), eq(contact.version, row.version)))
    .returning({ id: contact.id, version: contact.version });

  if (!updated) {
    throw new VersionConflictError();
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'contact.updated',
    entityType: 'contact',
    entityId: row.id,
    changes,
  });

  await touchContactActivity(tx, session, row.id, now);

  return updated;
}
