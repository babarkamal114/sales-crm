import { NextResponse } from 'next/server';
import { isIntegrationOAuthProvider } from '@/lib/integrations/oauth-providers';
import { writeAudit } from '@/server/audit/write';
import { getAppUrl } from '@/server/env';
import {
  clearIntegrationOAuthStateCookie,
  readIntegrationOAuthStateCookie,
} from '@/server/integrations/integration-oauth-cookies';
import { exchangeGoogleMailCode } from '@/server/integrations/google-mail-oauth';
import { exchangeMicrosoftMailCode } from '@/server/integrations/microsoft-mail-oauth';
import { encryptSecret } from '@/server/integrations/token-vault';
import { upsertIntegrationConnection } from '@/server/integrations/upsert-connection';
import { withTenant } from '@/server/db/with-tenant';
import { upsertMailboxFromOAuth } from '@/server/services/channels/upsert-mailbox-from-oauth';
import { dispatchOutboxEventIds } from '@/server/outbox/dispatch';

function redirectReturn(returnPath: string, result: 'connected' | 'failed') {
  const url = new URL(returnPath, getAppUrl());
  url.searchParams.set('integration', result);
  return NextResponse.redirect(url);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (!isIntegrationOAuthProvider(provider)) {
    return NextResponse.redirect(new URL('/getting-started', getAppUrl()));
  }

  const oauthState = await readIntegrationOAuthStateCookie();
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const returnPath = oauthState?.returnPath ?? '/getting-started';

  if (
    !oauthState ||
    !code ||
    !state ||
    oauthState.state !== state ||
    oauthState.provider !== provider
  ) {
    await clearIntegrationOAuthStateCookie();
    return redirectReturn(returnPath, 'failed');
  }

  let mailboxSyncOutboxId: string | null = null;

  try {
    if (provider === 'stripe_connect') {
      await clearIntegrationOAuthStateCookie();
      return redirectReturn(returnPath, 'failed');
    }

    const tokens =
      provider === 'google_mail'
        ? await exchangeGoogleMailCode(code)
        : await exchangeMicrosoftMailCode(code);

    await withTenant(
      {
        orgId: oauthState.orgId,
        userId: oauthState.userId,
        role: 'admin',
      },
      async (tx) => {
        await upsertIntegrationConnection(tx, {
          orgId: oauthState.orgId,
          provider,
          status: 'connected',
          externalAccountId: tokens.email,
          metadata: {
            email: tokens.email,
            accessTokenEnc: encryptSecret(tokens.accessToken),
            ...(tokens.refreshToken
              ? { refreshTokenEnc: encryptSecret(tokens.refreshToken) }
              : {}),
            ...('expiresIn' in tokens && typeof tokens.expiresIn === 'number'
              ? {
                  accessTokenExpiresAt: new Date(
                    Date.now() + tokens.expiresIn * 1000,
                  ).toISOString(),
                }
              : {}),
          },
          connectedBy: oauthState.userId,
        });

        if (provider === 'google_mail' || provider === 'microsoft_mail') {
          const accessTokenEnc = encryptSecret(tokens.accessToken);
          const { syncOutboxEventId } = await upsertMailboxFromOAuth(tx, {
            orgId: oauthState.orgId,
            userId: oauthState.userId,
            provider,
            email: tokens.email,
            accessTokenEnc,
            ...(tokens.refreshToken
              ? { refreshTokenEnc: encryptSecret(tokens.refreshToken) }
              : {}),
            ...('expiresIn' in tokens && typeof tokens.expiresIn === 'number'
              ? {
                  accessTokenExpiresAt: new Date(
                    Date.now() + tokens.expiresIn * 1000,
                  ).toISOString(),
                }
              : {}),
          });
          mailboxSyncOutboxId = syncOutboxEventId;
        }

        await writeAudit(tx, {
          orgId: oauthState.orgId,
          actorType: 'user',
          actorId: oauthState.userId,
          action: 'integration.connected',
          entityType: 'integration_connection',
          entityId: provider,
          changes: { provider: { to: provider }, email: { to: tokens.email } },
        });
      },
    );

    if (mailboxSyncOutboxId) {
      await dispatchOutboxEventIds(oauthState.orgId, [mailboxSyncOutboxId]);
    }

    await clearIntegrationOAuthStateCookie();
    return redirectReturn(returnPath, 'connected');
  } catch {
    await clearIntegrationOAuthStateCookie();
    return redirectReturn(returnPath, 'failed');
  }
}
