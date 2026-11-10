import 'server-only';

import { eq } from 'drizzle-orm';
import type { CrmSession } from '@/server/auth/session-types';
import { organisationSettings } from '@/server/db/schema';
import { withTenant } from '@/server/db/with-tenant';
import {
  listIntegrationsForOrg,
  type IntegrationCardModel,
} from '@/server/services/integrations/list-for-org';

export async function loadToolsStepIntegrations(
  session: CrmSession,
): Promise<IntegrationCardModel[]> {
  return withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) => {
      const [settings] = await tx
        .select({ leadSources: organisationSettings.leadSources })
        .from(organisationSettings)
        .where(eq(organisationSettings.orgId, session.orgId))
        .limit(1);

      return listIntegrationsForOrg(
        tx,
        session.orgId,
        settings?.leadSources ?? [],
      );
    },
  );
}
