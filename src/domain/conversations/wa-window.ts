const WA_WINDOW_MS = 24 * 60 * 60 * 1000;

export function waWindowExpiry(lastInboundWhatsAppAt: Date): Date {
  return new Date(lastInboundWhatsAppAt.getTime() + WA_WINDOW_MS);
}

export function waWindowOpen(lastInboundWhatsAppAt: Date | null, now: Date): boolean {
  if (!lastInboundWhatsAppAt) return false;
  return now.getTime() < waWindowExpiry(lastInboundWhatsAppAt).getTime();
}
