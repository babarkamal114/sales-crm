import 'server-only';

import { outboxEvent } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';

export async function enqueueOutbox(
  tx: DbTransaction,
  input: { orgId: string; type: string; payload: Record<string, unknown> },
): Promise<string> {
  const [row] = await tx
    .insert(outboxEvent)
    .values({
      orgId: input.orgId,
      type: input.type,
      payload: input.payload,
    })
    .returning({ id: outboxEvent.id });
  if (!row) throw new Error('Outbox insert failed');
  return row.id;
}
