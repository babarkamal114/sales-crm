export type IntegrationCapability =
  | 'email'
  | 'calendar'
  | 'telephony'
  | 'payments';

export type IntegrationProviderId =
  | 'google_mail'
  | 'microsoft_mail'
  | 'google_calendar'
  | 'microsoft_calendar'
  | 'twilio_voice'
  | 'stripe_connect';

export type IntegrationCatalogEntry = {
  id: IntegrationProviderId;
  capability: IntegrationCapability;
  name: string;
  description: string;
  /** Shown when org selected this lead source during onboarding */
  suggestedWhenLeadSources?: string[];
};

export const INTEGRATION_CATALOG: IntegrationCatalogEntry[] = [
  {
    id: 'google_mail',
    capability: 'email',
    name: 'Google Workspace',
    description: 'Send contact email from Gmail and sync threads on opportunities.',
    suggestedWhenLeadSources: ['inbound_email', 'referrals'],
  },
  {
    id: 'microsoft_mail',
    capability: 'email',
    name: 'Microsoft 365',
    description: 'Sync Outlook mail with your pipeline.',
    suggestedWhenLeadSources: ['inbound_email', 'referrals'],
  },
  {
    id: 'google_calendar',
    capability: 'calendar',
    name: 'Google Calendar',
    description: 'Book discovery calls without leaving CRM.',
  },
  {
    id: 'microsoft_calendar',
    capability: 'calendar',
    name: 'Outlook Calendar',
    description: 'See meetings next to each deal.',
  },
  {
    id: 'twilio_voice',
    capability: 'telephony',
    name: 'Calling',
    description: 'Click-to-call and call logging (Twilio).',
  },
  {
    id: 'stripe_connect',
    capability: 'payments',
    name: 'Stripe',
    description: 'Collect sponsorship payments on signed deals.',
  },
];

export function integrationCatalogForOrg(leadSources: string[]): IntegrationCatalogEntry[] {
  const set = new Set(leadSources);
  return [...INTEGRATION_CATALOG].sort((a, b) => {
    const aBoost = a.suggestedWhenLeadSources?.some((s) => set.has(s)) ? 0 : 1;
    const bBoost = b.suggestedWhenLeadSources?.some((s) => set.has(s)) ? 0 : 1;
    if (aBoost !== bBoost) return aBoost - bBoost;
    return a.name.localeCompare(b.name);
  });
}
