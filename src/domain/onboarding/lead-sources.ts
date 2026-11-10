export const LEAD_SOURCE_OPTIONS = [
  { id: 'meta_ads', label: 'Meta / social ads' },
  { id: 'website', label: 'Website enquiries' },
  { id: 'inbound_email', label: 'Inbound email' },
  { id: 'events', label: 'Events & activations' },
  { id: 'referrals', label: 'Referrals & partners' },
  { id: 'outbound', label: 'Outbound sales' },
] as const;

export const CONTACT_CHANNEL_OPTIONS = [
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'linkedin', label: 'LinkedIn' },
] as const;
