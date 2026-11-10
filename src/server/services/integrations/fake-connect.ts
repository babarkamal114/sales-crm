import 'server-only';

import { and, eq } from 'drizzle-orm';
import type { IntegrationProviderId } from '@/domain/integrations/catalog';
import { INTEGRATION_CATALOG } from '@/domain/integrations/catalog';
import { writeAudit } from '@/server/audit/write';
import { integrationConnection } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export async function fakeConnectIntegration(
  tx: DbTransaction,
  session: TenantSession,
  providerId: IntegrationProviderId,
): Promise<void> {
  const entry = INTEGRATION_CATALOG.find((e) => e.id === providerId);
  if (!entry) {
    throw new Error('Unknown integration provider');
  }

  const now = new Date();
  await tx
    .insert(integrationConnection)
    .values({
      orgId: session.orgId,
      provider: providerId,
      capability: entry.capability,
      status: 'connected',
      externalAccountId: `fake_${providerId}`,
      metadata: { mode: 'fake' },
      connectedBy: session.userId,
      connectedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        integrationConnection.orgId,
        integrationConnection.provider,
      ],
      set: {
        status: 'connected',
        externalAccountId: `fake_${providerId}`,
        metadata: { mode: 'fake' },
        connectedBy: session.userId,
        connectedAt: now,
        updatedAt: now,
      },
    });

  const [row] = await tx
    .select({ id: integrationConnection.id })
    .from(integrationConnection)
    .where(
      and(
        eq(integrationConnection.orgId, session.orgId),
        eq(integrationConnection.provider, providerId),
      ),
    )
    .limit(1);

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'integration.connected',
    entityType: 'integration_connection',
    entityId: row?.id ?? providerId,
    changes: { status: { from: 'disconnected', to: 'connected' }, provider: providerId },
    metadata: { mode: 'fake' },
  });
}
