export type ConsentChannel = 'email' | 'sms' | 'whatsapp' | 'call';

export type MarketingConsentState = 'granted' | 'denied' | 'unknown';

export type ChannelConsent = {
  channel: ConsentChannel;
  dnd: boolean;
  marketingConsent: MarketingConsentState;
};

export type CanContactSummary = Record<
  ConsentChannel,
  { allowed: boolean; reason?: string }
>;

export type ContactContactability = {
  email: string | null;
  phoneE164: string | null;
  recipientType: 'individual' | 'corporate';
  restricted: boolean;
};

/** Summary for list and drawer icons — full `canContact` lives in messaging (rule 23). */
export function canContactSummary(
  contact: ContactContactability,
  consent: ChannelConsent[],
): CanContactSummary {
  const byChannel = new Map(consent.map((row) => [row.channel, row]));

  const summarise = (
    channel: ConsentChannel,
    hasAddress: boolean,
  ): { allowed: boolean; reason?: string } => {
    if (contact.restricted) {
      return { allowed: false, reason: 'Restricted contact' };
    }
    if (!hasAddress) {
      return { allowed: false, reason: 'No address' };
    }
    const row = byChannel.get(channel);
    if (row?.dnd) {
      return { allowed: false, reason: 'Do not contact' };
    }
    if (row?.marketingConsent === 'denied') {
      return { allowed: false, reason: 'No consent' };
    }
    return { allowed: true };
  };

  return {
    email: summarise('email', Boolean(contact.email?.trim())),
    sms: summarise('sms', Boolean(contact.phoneE164)),
    whatsapp: summarise('whatsapp', Boolean(contact.phoneE164)),
    call: summarise('call', Boolean(contact.phoneE164)),
  };
}
