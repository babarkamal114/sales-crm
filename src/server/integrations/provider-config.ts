import 'server-only';

import { isGoogleAuthConfigured, isMicrosoftSsoConfigured } from '@/server/env';
import type { IntegrationProviderId } from '@/domain/integrations/catalog';

export type IntegrationProviderConfig = {
  configured: boolean;
  connectKind: 'oauth' | 'credentials' | 'unavailable';
  setupHint?: string;
};

export function integrationProviderConfig(
  providerId: IntegrationProviderId,
): IntegrationProviderConfig {
  switch (providerId) {
    case 'google_mail':
      return isGoogleAuthConfigured()
        ? { configured: true, connectKind: 'oauth' }
        : {
            configured: false,
            connectKind: 'unavailable',
            setupHint: 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to connect Gmail.',
          };
    case 'microsoft_mail':
      return isMicrosoftSsoConfigured()
        ? { configured: true, connectKind: 'oauth' }
        : {
            configured: false,
            connectKind: 'unavailable',
            setupHint:
              'Add Microsoft SSO client ID, secret, and tenant ID to connect Outlook.',
          };
    case 'twilio_voice':
      return { configured: true, connectKind: 'credentials' };
    case 'stripe_connect': {
      const hasStripe = Boolean(
        process.env.STRIPE_CONNECT_CLIENT_ID && process.env.STRIPE_SECRET_KEY,
      );
      return hasStripe
        ? { configured: true, connectKind: 'oauth' }
        : {
            configured: false,
            connectKind: 'unavailable',
            setupHint: 'Add STRIPE_CONNECT_CLIENT_ID and STRIPE_SECRET_KEY for Stripe Connect.',
          };
    }
    default:
      return { configured: true, connectKind: 'oauth' };
  }
}
