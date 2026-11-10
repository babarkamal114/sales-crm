import 'server-only';

import { eq } from 'drizzle-orm';
import { organisationSettings } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';

export async function collectContactDateOfBirth(
  tx: DbTransaction,
  orgId: string,
): Promise<boolean> {
  const [row] = await tx
    .select({ enabled: organisationSettings.collectContactDateOfBirth })
    .from(organisationSettings)
    .where(eq(organisationSettings.orgId, orgId))
    .limit(1);
  return row?.enabled ?? false;
}

export async function isAutoLinkContactsByEmailDomain(
  tx: DbTransaction,
  orgId: string,
): Promise<boolean> {
  const [row] = await tx
    .select({ enabled: organisationSettings.autoLinkContactsByEmailDomain })
    .from(organisationSettings)
    .where(eq(organisationSettings.orgId, orgId))
    .limit(1);
  return row?.enabled ?? true;
}
