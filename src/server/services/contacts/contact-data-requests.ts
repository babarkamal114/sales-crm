import 'server-only';

import type { contactDataRequestSchema } from '@/domain/contacts/mutation-schemas';
import type { z } from 'zod';
import { assertCan } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { requireContact } from '@/server/services/contacts/contact-access';

type Input = z.infer<typeof contactDataRequestSchema>;

/** Records a GDPR export request; file delivery is handled by a future job (W10). */
export async function requestContactExport(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ requestId: string; status: 'queued' }> {
  assertCan(session, 'contact.restrict');
  await requireContact(tx, session, input.contactId, 'contact.restrict');

  const requestId = crypto.randomUUID();

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'contact.export_requested',
    entityType: 'contact',
    entityId: input.contactId,
    metadata: { requestId, reason: input.reason ?? null, status: 'queued' },
  });

  return { requestId, status: 'queued' };
}

/** Records a GDPR erasure request; redaction job is future work (W10). */
export async function requestContactErasure(
  tx: DbTransaction,
  session: TenantSession,
  input: Input,
): Promise<{ requestId: string; status: 'queued' }> {
  assertCan(session, 'contact.restrict');
  await requireContact(tx, session, input.contactId, 'contact.restrict');

  const requestId = crypto.randomUUID();

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'contact.erasure_requested',
    entityType: 'contact',
    entityId: input.contactId,
    metadata: { requestId, reason: input.reason ?? null, status: 'queued' },
  });

  return { requestId, status: 'queued' };
}
