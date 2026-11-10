import 'server-only';

import { and, asc, eq, isNull } from 'drizzle-orm';
import { lostReason } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export async function listLostReasons(
  tx: DbTransaction,
  session: TenantSession,
): Promise<{ id: string; name: string }[]> {
  const rows = await tx
    .select({ id: lostReason.id, name: lostReason.name })
    .from(lostReason)
    .where(and(eq(lostReason.orgId, session.orgId), isNull(lostReason.archivedAt)))
    .orderBy(asc(lostReason.position));

  return rows;
}
