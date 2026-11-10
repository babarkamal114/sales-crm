export const CONTACT_LEAD_TABS = [
  { slug: 'activity', label: 'Activity', ready: true },
  { slug: 'associations', label: 'Associations', ready: true },
  { slug: 'opportunities', label: 'Opportunities', ready: true },
  { slug: 'conversations', label: 'Conversations', ready: true },
  { slug: 'email', label: 'Email', ready: true },
  { slug: 'tasks', label: 'Tasks', ready: true },
  { slug: 'notes', label: 'Notes', ready: true },
  { slug: 'documents', label: 'Documents', ready: false },
  { slug: 'payments', label: 'Payments', ready: false },
] as const;

export type ContactLeadTabSlug = (typeof CONTACT_LEAD_TABS)[number]['slug'];

export function contactLeadTabHref(contactId: string, slug: ContactLeadTabSlug) {
  return `/contacts/${contactId}/${slug}`;
}

export const LIFECYCLE_LABEL: Record<string, string> = {
  lead: 'Lead',
  customer: 'Customer',
  former_customer: 'Former customer',
  not_a_fit: 'Not a fit',
};
