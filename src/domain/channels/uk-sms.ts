/** Managed SMS is UK-only (+44 E.164). */
export function isUkE164(phone: string | null | undefined): boolean {
  const p = phone?.trim() ?? '';
  return p.startsWith('+44') && p.length >= 12;
}
