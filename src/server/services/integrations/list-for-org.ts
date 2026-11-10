import 'server-only';

import { eq } from 'drizzle-orm';
import {
  INTEGRATION_CATALOG,
  integrationCatalogForOrg,
  type IntegrationProviderId,
} from '@/domain/integrations/catalog';
import { integrationConnection } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';

export type IntegrationCardModel = {
  id: IntegrationProviderId;
  capability: string;
  name: string;
  description: string;
  status: 'disconnected' | 'pending' | 'connected' | 'error';
  suggested: boolean;
};

export async function listIntegrationsForOrg(
  tx: DbTransaction,
  orgId: string,
  leadSources: string[],
): Promise<IntegrationCardModel[]> {
  const rows = await tx
    .select()
    .from(integrationConnection)
    .where(eq(integrationConnection.orgId, orgId));

  const byProvider = new Map(rows.map((r) => [r.provider, r]));
  const leadSet = new Set(leadSources);
  const catalog = integrationCatalogForOrg(leadSources);

  return catalog.map((entry) => {
    const row = byProvider.get(entry.id);
    const suggested =
      entry.suggestedWhenLeadSources?.some((s) => leadSet.has(s)) ?? false;
    return {
      id: entry.id,
      capability: entry.capability,
      name: entry.name,
      description: entry.description,
      status: row?.status ?? 'disconnected',
      suggested,
    };
  });
}

export function isKnownIntegrationProvider(
  id: string,
): id is IntegrationProviderId {
  return INTEGRATION_CATALOG.some((e) => e.id === id);
}
