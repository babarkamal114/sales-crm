import { canContact } from '@/domain/conversations/can-contact';
import { isInQuietHours } from '@/domain/conversations/quiet-hours';
import { waWindowExpiry } from '@/domain/conversations/wa-window';
import type {
  CanSendResult,
  ConversationSendContext,
  MessageChannel,
  MessagePurpose,
  SendingSettings,
} from '@/domain/conversations/types';
import type { ChannelConsent, ContactContactability } from '@/domain/contacts/consent';

export type CanSendInput = {
  contact: ContactContactability;
  consent: ChannelConsent[];
  channel: MessageChannel;
  purpose: MessagePurpose;
  conversation: ConversationSendContext;
  now: Date;
  orgSettings: SendingSettings;
};

function channelConnected(
  channel: MessageChannel,
  orgSettings: SendingSettings,
): boolean {
  if (channel === 'email') return orgSettings.emailDomainVerified;
  if (channel === 'sms') return orgSettings.smsConnected;
  return orgSettings.whatsappConnected;
}

function connectionReason(channel: MessageChannel): string {
  if (channel === 'email') {
    return 'Connect your mailbox to send email (Settings → Channels).';
  }
  if (channel === 'sms') {
    return 'Phone & SMS is not set up. An Admin can configure it under Settings → Channels.';
  }
  return 'WhatsApp is not connected. Set it up under Settings → Channels.';
}

/** Composer and server gate for outbound messages (wraps `canContact`). */
export function canSend(input: CanSendInput): CanSendResult {
  const { channel, purpose, now, orgSettings, conversation } = input;

  if (!channelConnected(channel, orgSettings)) {
    return {
      allowed: false,
      mode: 'blocked',
      reason: connectionReason(channel),
    };
  }

  if (
    (channel === 'sms' || channel === 'whatsapp') &&
    orgSettings.managedSpendPaused
  ) {
    return {
      allowed: false,
      mode: 'blocked',
      reason:
        'Managed SMS/WhatsApp sending is paused — monthly spend limit reached. See Settings → Channels → Usage.',
    };
  }

  const base = canContact({
    channel,
    purpose,
    contact: input.contact,
    consent: input.consent,
    whatsapp: {
      lastInboundAt: conversation.lastInboundWhatsAppAt,
    },
    now,
    orgSettings,
  });

  if (!base.allowed) {
    return {
      allowed: false,
      mode: 'blocked',
      reason: base.message,
    };
  }

  if (channel === 'whatsapp') {
    const expires =
      conversation.waWindowExpiresAt ??
      (conversation.lastInboundWhatsAppAt
        ? waWindowExpiry(conversation.lastInboundWhatsAppAt)
        : null);
    const windowOpen = expires !== null && now.getTime() < expires.getTime();
    if (!windowOpen) {
      return {
        allowed: true,
        mode: 'template_only',
        reason:
          'The 24-hour WhatsApp window has closed. Choose an approved template to send a message.',
      };
    }
    const hoursLeft = Math.max(
      0,
      Math.ceil((expires.getTime() - now.getTime()) / (60 * 60 * 1000)),
    );
    if (hoursLeft <= 2) {
      return {
        allowed: true,
        mode: 'allowed',
        reason: `WhatsApp window open · about ${hoursLeft} h left`,
      };
    }
  }

  if (purpose === 'marketing' && isInQuietHours(now, orgSettings)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return {
      allowed: false,
      mode: 'warn_quiet_hours',
      reason:
        'Quiet hours are active for marketing. This message will be scheduled for the next allowed window.',
      scheduleAt: tomorrow,
    };
  }

  if (purpose === 'conversation' && isInQuietHours(now, orgSettings)) {
    return {
      allowed: true,
      mode: 'warn_quiet_hours',
      reason:
        'Quiet hours are on — one-to-one replies are still allowed, but be mindful of the time.',
    };
  }

  return { allowed: true, mode: 'allowed', reason: '' };
}
