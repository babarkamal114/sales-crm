export const CONTACT_LIST_COLUMNS = [
  'name',
  'phone',
  'company',
  'open_deal',
  'owner',
  'tags',
  'source',
  'can_contact',
  'last_activity',
  'created',
] as const;

export type ContactListColumnId = (typeof CONTACT_LIST_COLUMNS)[number];

export const DEFAULT_CONTACT_LIST_COLUMNS: ContactListColumnId[] = [
  'name',
  'phone',
  'company',
  'open_deal',
  'owner',
  'can_contact',
  'last_activity',
];

export const CONTACT_LIST_COLUMN_LABELS: Record<ContactListColumnId, string> = {
  name: 'Name',
  phone: 'Phone',
  company: 'Company',
  open_deal: 'Open deal',
  owner: 'Owner',
  tags: 'Tags',
  source: 'Source',
  can_contact: 'Can contact',
  last_activity: 'Last activity',
  created: 'Created',
};

export function parseColumnsParam(raw: string | null): ContactListColumnId[] {
  if (!raw?.trim()) return DEFAULT_CONTACT_LIST_COLUMNS;
  const allowed = new Set(CONTACT_LIST_COLUMNS);
  const parsed = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part): part is ContactListColumnId => allowed.has(part as ContactListColumnId));
  return parsed.length > 0 ? parsed : DEFAULT_CONTACT_LIST_COLUMNS;
}

export function serializeColumnsParam(columns: ContactListColumnId[]): string {
  return columns.join(',');
}
