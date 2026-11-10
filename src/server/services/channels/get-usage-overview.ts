import 'server-only';

import { assertCan } from '@/server/access/capabilities';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import type { UsageOverview } from '@/domain/channels/usage-types';
import {
  getSpendSummary,
  getUsageBreakdownByChannel,
} from '@/server/services/channels/usage-billing';

export type { UsageOverview } from '@/domain/channels/usage-types';

export async function getUsageOverview(
  tx: DbTransaction,
  session: TenantSession,
): Promise<UsageOverview> {
  assertCan(session, 'contact.view');

  const spend = await getSpendSummary(tx, session.orgId);
  const byChannel = await getUsageBreakdownByChannel(tx, session.orgId);

  return { spend, byChannel };
}
