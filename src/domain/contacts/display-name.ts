export type ContactNameFields = {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneE164: string | null;
};

export function displayName(contact: ContactNameFields): string {
  const first = contact.firstName?.trim() ?? '';
  const last = contact.lastName?.trim() ?? '';
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  if (contact.email?.trim()) return contact.email.trim();
  if (contact.phoneE164) return contact.phoneE164;
  return 'Unnamed contact';
}
