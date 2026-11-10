export const OPPORTUNITY_VALUE_TYPE_OPTIONS = [
  { value: 'one_off', label: 'One-off' },
  { value: 'recurring_monthly', label: 'Recurring (monthly)' },
  { value: 'recurring_annual', label: 'Recurring (annual)' },
] as const;

export const OPPORTUNITY_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
] as const;

export const OPPORTUNITY_SOURCE_OPTIONS = [
  { value: 'Manual', label: 'Manual' },
  { value: 'Website', label: 'Website' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Event', label: 'Event' },
  { value: 'Ads', label: 'Ads' },
  { value: 'Inbound call', label: 'Inbound call' },
  { value: 'Other', label: 'Other' },
] as const;

export type OpportunityValueType = (typeof OPPORTUNITY_VALUE_TYPE_OPTIONS)[number]['value'];
export type OpportunityPriority = (typeof OPPORTUNITY_PRIORITY_OPTIONS)[number]['value'];
