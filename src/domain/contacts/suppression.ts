import { createHash } from 'node:crypto';
import { normaliseEmail, normalisePhone } from '@/domain/contacts/normalise';

export function suppressionEmailHash(email: string | null | undefined): string | null {
  const normalised = normaliseEmail(email ?? null);
  if (!normalised) return null;
  return createHash('sha256').update(normalised).digest('hex');
}

export function suppressionPhoneHash(phoneE164: string | null | undefined): string | null {
  const normalised = normalisePhone(phoneE164 ?? undefined);
  if (!normalised) return null;
  return createHash('sha256').update(normalised).digest('hex');
}
