import 'server-only';

import { and, eq } from 'drizzle-orm';
import type { setContactConsentSchema } from '@/domain/contacts/mutation-schemas';
import type { z } from 'zod';
import { writeAudit } from '@/server/audit/write';
import { contact, contactConsent, contactConsentHistory } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  assertContactVersion,
  requireContact,
  touchContactActivity,
  VersionConflictError,
} from '@/server/services/contacts/contact-access';

type Input = z.infer<typeof setContactConsentSchema>;

export async function setContactConsent(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ id: string; version: number }> {
  const row = await requireContact(tx, session, input.contactId);
  assertContactVersion(row, input.version);

  const [existing] = await tx
    .select()
    .from(contactConsent)
    .where(
      and(
        eq(contactConsent.orgId, session.orgId),
        eq(contactConsent.contactId, row.id),
        eq(contactConsent.channel, input.channel),
      ),
    )
    .limit(1);

  const nextDnd = input.dnd ?? existing?.dnd ?? false;
  const nextMarketing =
    input.marketingConsent ?? existing?.marketingConsent ?? ('unknown' as const);

  if (
    existing &&
    existing.dnd === nextDnd &&
    existing.marketingConsent === nextMarketing &&
    input.source === undefined &&
    input.wording === undefined
  ) {
    return { id: row.id, version: row.version };
  }

  const now = new Date();

  if (existing) {
    await tx
      .update(contactConsent)
      .set({
        dnd: nextDnd,
        marketingConsent: nextMarketing,
        source: input.source ?? existing.source,
        wording: input.wording ?? existing.wording,
        updatedAt: now,
        updatedBy: session.userId,
      })
      .where(eq(contactConsent.id, existing.id));
  } else {
    await tx.insert(contactConsent).values({
      orgId: session.orgId,
      contactId: row.id,
      channel: input.channel,
      dnd: nextDnd,
      marketingConsent: nextMarketing,
      source: input.source ?? null,
      wording: input.wording ?? null,
      updatedAt: now,
      updatedBy: session.userId,
    });
  }

  await tx.insert(contactConsentHistory).values({
    orgId: session.orgId,
    contactId: row.id,
    channel: input.channel,
    dnd: nextDnd,
    marketingConsent: nextMarketing,
    reason: input.reason ?? null,
    changedAt: now,
    changedBy: session.userId,
  });

  const [updated] = await tx
    .update(contact)
    .set({
      version: row.version + 1,
      updatedAt: now,
      updatedBy: session.userId,
      lastActivityAt: now,
      marketingConsent:
        input.channel === 'email' && nextMarketing === 'granted'
          ? true
          : row.marketingConsent,
    })
    .where(and(eq(contact.id, row.id), eq(contact.version, row.version)))
    .returning({ id: contact.id, version: contact.version });

  if (!updated) {
    throw new VersionConflictError();
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'contact.consent_updated',
    entityType: 'contact',
    entityId: row.id,
    changes: {
      channel: { to: input.channel },
      dnd: { from: existing?.dnd ?? false, to: nextDnd },
      marketingConsent: { from: existing?.marketingConsent ?? 'unknown', to: nextMarketing },
    },
  });

  await touchContactActivity(tx, session, row.id, now);
  return updated;
}
