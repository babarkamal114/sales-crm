import 'server-only';

import type { IntegrationProviderId } from '@/domain/integrations/catalog';
import { INTEGRATION_CATALOG } from '@/domain/integrations/catalog';
import { integrationConnection } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';

export async function upsertIntegrationConnection(
  tx: DbTransaction,
  input: {
    orgId: string;
    provider: IntegrationProviderId;
    status: 'connected' | 'pending' | 'error' | 'disconnected';
    externalAccountId?: string | null;
    metadata?: Record<string, unknown>;
    connectedBy: string;
  },
): Promise<void> {
  const entry = INTEGRATION_CATALOG.find((c) => c.id === input.provider);
  if (!entry) {
    throw new Error('Unknown integration provider');
  }

  const now = new Date();
  const values = {
    orgId: input.orgId,
    provider: input.provider,
    capability: entry.capability,
    status: input.status,
    externalAccountId: input.externalAccountId ?? null,
    metadata: input.metadata ?? {},
    connectedBy: input.connectedBy,
    connectedAt: input.status === 'connected' ? now : null,
    updatedAt: now,
  };

  await tx
    .insert(integrationConnection)
    .values(values)
    .onConflictDoUpdate({
      target: [integrationConnection.orgId, integrationConnection.provider],
      set: {
        capability: values.capability,
        status: values.status,
        externalAccountId: values.externalAccountId,
        metadata: values.metadata,
        connectedBy: values.connectedBy,
        connectedAt: values.connectedAt,
        updatedAt: values.updatedAt,
      },
    });
}
