import 'server-only';

import { and, eq, or } from 'drizzle-orm';
import {
  suppressionEmailHash,
  suppressionPhoneHash,
} from '@/domain/contacts/suppression';
import { suppression } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';

export async function findSuppressionMatch(
  tx: DbTransaction,
  orgId: string,
  email: string | null,
  phoneE164: string | null,
): Promise<{ reason: string } | null> {
  const emailHash = suppressionEmailHash(email);
  const phoneHash = suppressionPhoneHash(phoneE164);

  if (!emailHash && !phoneHash) {
    return null;
  }

  const predicates = [];
  if (emailHash) {
    predicates.push(eq(suppression.emailHash, emailHash));
  }
  if (phoneHash) {
    predicates.push(eq(suppression.phoneHash, phoneHash));
  }

  const [row] = await tx
    .select({ reason: suppression.reason })
    .from(suppression)
    .where(and(eq(suppression.orgId, orgId), or(...predicates)))
    .limit(1);

  return row ?? null;
}
