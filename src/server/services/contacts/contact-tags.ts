import 'server-only';

import { asc, eq } from 'drizzle-orm';
import type { createTagSchema } from '@/domain/contacts/mutation-schemas';
import type { z } from 'zod';
import { assertCan } from '@/server/access/capabilities';
import { tag } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

type CreateTagInput = z.infer<typeof createTagSchema>;

export async function listContactTags(
  tx: DbTransaction,
  session: TenantSession,
): Promise<{ id: string; name: string; colourKey: string }[]> {
  assertCan(session, 'contact.view');

  return tx
    .select({
      id: tag.id,
      name: tag.name,
      colourKey: tag.colourKey,
    })
    .from(tag)
    .where(eq(tag.orgId, session.orgId))
    .orderBy(asc(tag.name));
}

export async function createContactTag(
  tx: DbTransaction,
  session: TenantSession,
  input: CreateTagInput,
): Promise<{ id: string }> {
  assertCan(session, 'contact.update');

  const [row] = await tx
    .insert(tag)
    .values({
      orgId: session.orgId,
      name: input.name,
      colourKey: input.colourKey,
      createdBy: session.userId,
    })
    .returning({ id: tag.id });

  return { id: row!.id };
}
