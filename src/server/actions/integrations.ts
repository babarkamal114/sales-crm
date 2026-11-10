'use server';

import { z } from 'zod';
import { actionFailure, actionSuccess, type ActionResult } from '@/lib/action-result';
import type { IntegrationProviderId } from '@/domain/integrations/catalog';
import { requireSession } from '@/server/auth/require-session';
import { writeAudit } from '@/server/audit/write';
import { withTenant } from '@/server/db/with-tenant';
import { encryptSecret } from '@/server/integrations/token-vault';
import { upsertIntegrationConnection } from '@/server/integrations/upsert-connection';
import {
  integrationProviderConfig,
  type IntegrationProviderConfig,
} from '@/server/integrations/provider-config';
import { isKnownIntegrationProvider } from '@/server/services/integrations/list-for-org';

const providerSchema = z.object({
  providerId: z.string().min(1),
});

const twilioSchema = z.object({
  accountSid: z.string().trim().min(1),
  authToken: z.string().trim().min(1),
});

export async function getIntegrationProviderConfigsAction(): Promise<
  ActionResult<Record<IntegrationProviderId, IntegrationProviderConfig>>
> {
  try {
    await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }

  const ids = [
    'google_mail',
    'microsoft_mail',
    'twilio_voice',
    'stripe_connect',
  ] as const satisfies readonly IntegrationProviderId[];

  const configs = Object.fromEntries(
    ids.map((id) => [id, integrationProviderConfig(id)]),
  ) as Record<IntegrationProviderId, IntegrationProviderConfig>;

  return actionSuccess(configs);
}

export async function disconnectIntegrationAction(
  input: unknown,
): Promise<ActionResult<Record<string, never>>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }
  if (session.role !== 'admin') {
    return actionFailure('FORBIDDEN', 'Only admins can manage integrations.');
  }

  const parsed = providerSchema.safeParse(input);
  if (!parsed.success || !isKnownIntegrationProvider(parsed.data.providerId)) {
    return actionFailure('VALIDATION_FAILED', 'Choose a valid integration.');
  }

  const providerId = parsed.data.providerId;

  await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) => {
      await upsertIntegrationConnection(tx, {
        orgId: session.orgId,
        provider: providerId,
        status: 'disconnected',
        metadata: {},
        connectedBy: session.userId,
      });

      await writeAudit(tx, {
        orgId: session.orgId,
        actorType: 'user',
        actorId: session.userId,
        action: 'integration.disconnected',
        entityType: 'integration_connection',
        entityId: providerId,
      });
    },
  );

  return actionSuccess({});
}

export async function connectTwilioIntegrationAction(
  input: unknown,
): Promise<ActionResult<{ accountSid: string }>> {
  let session;
  try {
    session = await requireSession();
  } catch {
    return actionFailure('UNAUTHENTICATED', 'Sign in to continue.');
  }
  if (session.role !== 'admin') {
    return actionFailure('FORBIDDEN', 'Only admins can connect calling.');
  }

  const parsed = twilioSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure('VALIDATION_FAILED', 'Enter Twilio Account SID and Auth Token.');
  }

  const authHeader = Buffer.from(
    `${parsed.data.accountSid}:${parsed.data.authToken}`,
  ).toString('base64');

  const verify = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${parsed.data.accountSid}.json`,
    {
      headers: { Authorization: `Basic ${authHeader}` },
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!verify.ok) {
    return actionFailure('VALIDATION_FAILED', 'Twilio rejected those credentials.');
  }

  await withTenant(
    { orgId: session.orgId, userId: session.userId, role: session.role },
    async (tx) => {
      await upsertIntegrationConnection(tx, {
        orgId: session.orgId,
        provider: 'twilio_voice',
        status: 'connected',
        externalAccountId: parsed.data.accountSid,
        metadata: {
          authTokenEnc: encryptSecret(parsed.data.authToken),
        },
        connectedBy: session.userId,
      });

      await writeAudit(tx, {
        orgId: session.orgId,
        actorType: 'user',
        actorId: session.userId,
        action: 'integration.connected',
        entityType: 'integration_connection',
        entityId: 'twilio_voice',
      });
    },
  );

  return actionSuccess({ accountSid: parsed.data.accountSid });
}
