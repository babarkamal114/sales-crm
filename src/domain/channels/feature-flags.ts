/** Managed WhatsApp (Twilio Tech Provider + Meta Embedded Signup). */
export function isManagedWhatsAppEnabled(): boolean {
  if (process.env.CHANNELS_MANAGED_WHATSAPP === '1') return true;
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.CHANNELS_USE_FAKE === '1'
  ) {
    return true;
  }
  return false;
}
