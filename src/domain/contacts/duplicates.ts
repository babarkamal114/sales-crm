import { normaliseEmail, normalisePhone } from '@/domain/contacts/normalise';

export type DuplicateMatchKey =
  | { kind: 'email'; value: string }
  | { kind: 'phone'; value: string }
  | { kind: 'name_company'; name: string; companyId: string | null };

export type ContactDuplicateInput = {
  email: string | null;
  phoneE164: string | null;
  firstName: string | null;
  lastName: string | null;
  companyId: string | null;
};

export function findDuplicateKeys(input: ContactDuplicateInput): DuplicateMatchKey[] {
  const keys: DuplicateMatchKey[] = [];

  const email = normaliseEmail(input.email);
  if (email) {
    keys.push({ kind: 'email', value: email });
  }

  const phone = normalisePhone(input.phoneE164);
  if (phone) {
    keys.push({ kind: 'phone', value: phone });
  }

  const name = `${input.firstName ?? ''} ${input.lastName ?? ''}`.trim().toLowerCase();
  if (name.length >= 3) {
    keys.push({ kind: 'name_company', name, companyId: input.companyId ?? null });
  }

  return keys;
}
