export const COMPANY_SIZE_BANDS = [
  { value: '1-5', label: '1–5' },
  { value: '6-20', label: '6–20' },
  { value: '21-50', label: '21–50' },
  { value: '51-200', label: '51–200' },
  { value: '200+', label: '200+' },
] as const;

export const COMPANY_LIFECYCLE_OPTIONS = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'customer', label: 'Customer' },
  { value: 'former_customer', label: 'Former customer' },
  { value: 'not_a_fit', label: 'Not a fit' },
] as const;

export const COMPANY_RECIPIENT_OPTIONS = [
  { value: 'corporate', label: 'Company (corporate)' },
  { value: 'individual', label: 'Sole trader or partnership' },
] as const;

export const COMPANY_COUNTRY_OPTIONS = [
  { value: 'GB', label: 'United Kingdom' },
  { value: 'IE', label: 'Ireland' },
  { value: 'US', label: 'United States' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
] as const;

/** Default industry list until organisation settings expose a custom list. */
export const COMPANY_INDUSTRY_OPTIONS = [
  'Sport & entertainment',
  'Media & broadcast',
  'Professional services',
  'Technology',
  'Charity & events',
  'Manufacturing',
  'Retail',
  'Other',
] as const;
