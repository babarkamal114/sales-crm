import type { IntegrationProviderId } from '@/domain/integrations/catalog';

export type IntegrationOAuthProviderId = 'google_mail' | 'microsoft_mail' | 'stripe_connect';

export const INTEGRATION_OAUTH_RETURN_COOKIE = 'sponsoro_crm_integration_oauth';
export const INTEGRATION_OAUTH_TTL_MS = 15 * 60 * 1000;

export type IntegrationOAuthState = {
  state: string;
  provider: IntegrationOAuthProviderId;
  orgId: string;
  userId: string;
  returnPath: string;
  expiresAt: number;
};

export function isIntegrationOAuthProvider(
  id: string,
): id is IntegrationOAuthProviderId {
  return id === 'google_mail' || id === 'microsoft_mail' || id === 'stripe_connect';
}

export function integrationProviderFromId(
  id: IntegrationProviderId,
): IntegrationOAuthProviderId | null {
  if (id === 'google_mail' || id === 'microsoft_mail' || id === 'stripe_connect') {
    return id;
  }
  return null;
}

export const GOOGLE_MAIL_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
].join(' ');

export const MICROSOFT_MAIL_SCOPES = [
  'openid',
  'email',
  'offline_access',
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Mail.Send',
].join(' ');
