import 'server-only';

import { and, eq } from 'drizzle-orm';
import { writeAudit } from '@/server/audit/write';
import { accessRequest } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';

export async function createAccessRequest(
  tx: DbTransaction,
  input: { orgId: string; userId: string },
): Promise<{ created: boolean; requestId: string }> {
  const [pending] = await tx
    .select()
    .from(accessRequest)
    .where(
      and(
        eq(accessRequest.orgId, input.orgId),
        eq(accessRequest.requesterUserId, input.userId),
        eq(accessRequest.status, 'pending'),
      ),
    )
    .limit(1);

  if (pending) {
    return { created: false, requestId: pending.id };
  }

  const [row] = await tx
    .insert(accessRequest)
    .values({
      orgId: input.orgId,
      requesterUserId: input.userId,
      status: 'pending',
    })
    .returning({ id: accessRequest.id });

  await writeAudit(tx, {
    orgId: input.orgId,
    actorType: 'user',
    actorId: input.userId,
    action: 'access_request.created',
    entityType: 'access_request',
    entityId: row!.id,
  });

  return { created: true, requestId: row!.id };
}
