import type { ConsentChannel } from '@/domain/contacts/consent';
import { isInQuietHours } from '@/domain/conversations/quiet-hours';
import type { CanContactInput, CanContactResult } from '@/domain/conversations/types';
import { marketingBlocked } from '@/domain/conversations/types';

function consentRow(input: CanContactInput, channel: ConsentChannel) {
  return input.consent.find((row) => row.channel === channel);
}

function hasAddress(input: CanContactInput): boolean {
  const { channel, contact } = input;
  if (channel === 'email') return Boolean(contact.email?.trim());
  if (channel === 'sms' || channel === 'whatsapp' || channel === 'call') {
    return Boolean(contact.phoneE164);
  }
  return false;
}

function quietHoursBlock(input: CanContactInput): CanContactResult | null {
  if (input.purpose !== 'marketing') return null;
  if (!isInQuietHours(input.now, input.orgSettings)) return null;
  return {
    allowed: false,
    reason: 'QUIET_HOURS',
    message: 'Marketing messages cannot be sent during quiet hours.',
  };
}

/** Rule 23 send decision (server source of truth). */
export function canContact(input: CanContactInput): CanContactResult {
  if (input.contact.restricted) {
    return {
      allowed: false,
      reason: 'RESTRICTED',
      message: 'This contact is restricted.',
    };
  }

  if (!hasAddress(input)) {
    return {
      allowed: false,
      reason: 'NO_ADDRESS',
      message: 'This contact has no address for this channel.',
    };
  }

  const channel =
    input.channel === 'call' ? 'call' : (input.channel as ConsentChannel);
  const row = consentRow(input, channel);
  if (row?.dnd) {
    return {
      allowed: false,
      reason: 'DND',
      message:
        input.channel === 'sms'
          ? 'SMS is off for this contact (STOP).'
          : 'Do not contact is set for this channel.',
    };
  }

  if (marketingBlocked(input.purpose, row?.marketingConsent)) {
    return {
      allowed: false,
      reason: 'NO_CONSENT',
      message: 'Marketing consent is not granted for this channel.',
    };
  }

  const quiet = quietHoursBlock(input);
  if (quiet) return quiet;

  if (input.channel === 'whatsapp' && input.purpose !== 'conversation') {
    const last = input.whatsapp?.lastInboundAt;
    if (!last) {
      return {
        allowed: false,
        reason: 'NOT_OPTED_IN',
        message: 'WhatsApp requires an inbound message before marketing.',
      };
    }
  }

  return { allowed: true };
}
