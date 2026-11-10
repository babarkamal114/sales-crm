import type {
  ChannelConsent,
  ContactContactability,
  MarketingConsentState,
} from '@/domain/contacts/consent';

export type MessageChannel = 'email' | 'sms' | 'whatsapp';
export type MessagePurpose = 'conversation' | 'marketing';
export type ConversationStatus = 'open' | 'snoozed' | 'closed';

export type SendBlockReason =
  | 'NO_ADDRESS'
  | 'DND'
  | 'NO_CONSENT'
  | 'TPS_REGISTERED'
  | 'CTPS_REGISTERED'
  | 'TEMPLATE_REQUIRED'
  | 'TEMPLATE_NOT_APPROVED'
  | 'QUIET_HOURS'
  | 'INVALID_NUMBER'
  | 'NOT_CONNECTED'
  | 'NOT_OPTED_IN'
  | 'RESTRICTED';

export type CanSendMode =
  | 'allowed'
  | 'blocked'
  | 'template_only'
  | 'warn_quiet_hours';

export type CanSendResult = {
  allowed: boolean;
  mode: CanSendMode;
  reason: string;
  scheduleAt?: Date;
};

export type SendingSettings = {
  timeZone: string;
  /** Weekday 0=Sunday … 6=Saturday, local org time */
  quietHours?: {
    startMinutes: number;
    endMinutes: number;
    days: number[];
  };
  emailDomainVerified: boolean;
  smsConnected: boolean;
  whatsappConnected: boolean;
  /** Managed telephony spend gate (Channels Phase 6). */
  managedSpendPaused?: boolean;
  managedSpendAlert?: boolean;
};

export type ConversationSendContext = {
  waWindowExpiresAt: Date | null;
  lastInboundWhatsAppAt: Date | null;
};

export type CanContactInput = {
  channel: 'email' | 'sms' | 'whatsapp' | 'call';
  purpose: 'conversation' | 'marketing' | 'transactional';
  contact: ContactContactability;
  consent: ChannelConsent[];
  whatsapp?: { lastInboundAt: Date | null; templateApproved?: boolean };
  now: Date;
  orgSettings: SendingSettings;
};

export type CanContactResult =
  | { allowed: true }
  | { allowed: false; reason: SendBlockReason; message: string };

export type MessageTimelineItem = {
  direction: 'inbound' | 'outbound';
  channel: MessageChannel | 'comment' | 'call' | 'event';
  createdAt: Date;
  isAutoReply?: boolean;
};

export type EmailThreadHeaders = {
  replyToken?: string | null;
  inReplyTo?: string | null;
  references?: string[];
  fromAddress?: string | null;
};

export type EmailThreadMatch =
  | { kind: 'reply_token'; token: string }
  | { kind: 'in_reply_to'; messageId: string }
  | { kind: 'references'; messageId: string }
  | { kind: 'from_address'; address: string }
  | { kind: 'none' };

export type TemplateVariableMap = Record<string, string | undefined>;

export type RenderTemplateResult =
  | { ok: true; body: string; subject?: string }
  | { ok: false; missing: string[] };

export type MentionUser = { id: string; handle: string };

/** Maps marketing consent for stricter checks */
export function marketingBlocked(
  purpose: CanContactInput['purpose'],
  marketingConsent: MarketingConsentState | undefined,
): boolean {
  if (purpose !== 'marketing') return false;
  return marketingConsent !== 'granted';
}
