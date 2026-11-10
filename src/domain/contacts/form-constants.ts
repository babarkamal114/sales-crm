import type { ContactLifecycle } from '@/domain/contacts/lifecycle';
import type { MarketingConsentState } from '@/domain/contacts/consent';

export const CONTACT_LIFECYCLE_OPTIONS: { value: ContactLifecycle; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'customer', label: 'Customer' },
  { value: 'former_customer', label: 'Former customer' },
  { value: 'not_a_fit', label: 'Not a fit' },
];

export const CONTACT_LEAD_SOURCE_OPTIONS = [
  { value: 'Manual', label: 'Manual' },
  { value: 'Website', label: 'Website' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Event', label: 'Event' },
  { value: 'Ads', label: 'Ads' },
  { value: 'Inbound call', label: 'Inbound call' },
  { value: 'Other', label: 'Other' },
] as const;

export const CONSENT_SOURCE_OPTIONS = [
  { value: 'website_form', label: 'Website form' },
  { value: 'verbal', label: 'Verbal' },
  { value: 'written', label: 'Written' },
  { value: 'event', label: 'Event' },
  { value: 'imported', label: 'Imported' },
  { value: 'other', label: 'Other' },
] as const;

export const CONTACT_RECIPIENT_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'corporate', label: 'Corporate' },
] as const;

export const CONSENT_CHANNEL_LABELS = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  call: 'Calls',
} as const;

export const MARKETING_CONSENT_LABELS: Record<MarketingConsentState, string> = {
  unknown: 'Not given',
  granted: 'Consent given',
  denied: 'Opted out',
};
