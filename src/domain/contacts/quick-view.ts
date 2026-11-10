import type {
  CanContactSummary,
  ChannelConsent,
  ConsentChannel,
  MarketingConsentState,
} from '@/domain/contacts/consent';

export type ContactQuickView = {
  id: string;
  version: number;
  displayName: string;
  firstName: string;
  lastName: string;
  initials: string;
  jobTitle: string | null;
  companyName: string | null;
  companyId: string | null;
  email: string | null;
  phoneE164: string | null;
  emailVerified: boolean;
  source: string | null;
  createdAt: string;
  lastActivityAt: string | null;
  restricted: boolean;
  lifecycle: string;
  owner: { id: string; fullName: string; initials: string; colour: string };
  tags: { id: string; name: string; colourKey: string }[];
  canContact: CanContactSummary;
  preferences: ChannelConsent[];
  marketingConsent: MarketingConsentState;
  nextTaskDueAt: string | null;
  opportunities: {
    id: string;
    name: string;
    valuePence: number | null;
    stageName: string;
    status: 'open' | 'won' | 'lost';
  }[];
  recentActivity: {
    id: string;
    label: string;
    at: string;
  }[];
};

export const CONSENT_CHANNELS: ConsentChannel[] = ['email', 'sms', 'call', 'whatsapp'];
