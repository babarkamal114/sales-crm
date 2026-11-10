import { NextResponse } from 'next/server';
import { isIntegrationOAuthProvider } from '@/lib/integrations/oauth-providers';
import { requireSession } from '@/server/auth/require-session';
import { getAppUrl } from '@/server/env';
import {
  setIntegrationOAuthStateCookie,
} from '@/server/integrations/integration-oauth-cookies';
import { buildGoogleMailAuthorizationUrl } from '@/server/integrations/google-mail-oauth';
import { buildMicrosoftMailAuthorizationUrl } from '@/server/integrations/microsoft-mail-oauth';
import { integrationProviderConfig } from '@/server/integrations/provider-config';

function redirectGettingStarted(error?: string) {
  const url = new URL('/getting-started', getAppUrl());
  if (error) {
    url.searchParams.set('integration', error);
  }
  return NextResponse.redirect(url);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (!isIntegrationOAuthProvider(provider)) {
    return redirectGettingStarted('invalid_provider');
  }

  let session;
  try {
    session = await requireSession();
  } catch {
    return NextResponse.redirect(new URL('/sign-in', getAppUrl()));
  }

  if (session.role !== 'admin') {
    return redirectGettingStarted('forbidden');
  }

  const config = integrationProviderConfig(provider);
  if (!config.configured || config.connectKind !== 'oauth') {
    return redirectGettingStarted('not_configured');
  }

  const requestUrl = new URL(request.url);
  const returnPath = requestUrl.searchParams.get('return') ?? '/getting-started';

  try {
    const state = await setIntegrationOAuthStateCookie({
      provider,
      orgId: session.orgId,
      userId: session.userId,
      returnPath,
    });

    const authorizeUrl =
      provider === 'google_mail'
        ? buildGoogleMailAuthorizationUrl({ state })
        : provider === 'microsoft_mail'
          ? buildMicrosoftMailAuthorizationUrl({ state })
          : null;

    if (provider === 'stripe_connect') {
      const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
      if (!clientId) {
        return redirectGettingStarted('not_configured');
      }
      const stripeParams = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: 'read_write',
        state,
        redirect_uri: `${getAppUrl()}/api/integrations/stripe_connect/callback`,
      });
      return NextResponse.redirect(
        `https://connect.stripe.com/oauth/authorize?${stripeParams.toString()}`,
      );
    }

    if (!authorizeUrl) {
      return redirectGettingStarted('invalid_provider');
    }

    return NextResponse.redirect(authorizeUrl);
  } catch {
    return redirectGettingStarted('failed');
  }
}
