/** Normalised channel types — features must not import provider SDK types. */

export type ChannelKind = 'sms' | 'voice' | 'whatsapp';

export type ConnectionMode = 'managed' | 'byo';

export type ConnectionProvider = 'twilio' | 'meta' | 'vonage' | 'telnyx';

export type ConnectionStatus =
  | 'draft'
  | 'pending'
  | 'verifying'
  | 'active'
  | 'degraded'
  | 'failed'
  | 'suspended'
  | 'disconnected';

export type MailboxProviderKind = 'google' | 'microsoft' | 'imap';

export type MailboxStatus =
  | 'connecting'
  | 'syncing_initial'
  | 'active'
  | 'degraded'
  | 'reconnect_required'
  | 'disconnected';

export type ChannelErrorCode =
  | 'invalid_recipient'
  | 'recipient_opted_out'
  | 'not_verified'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'auth_failed'
  | 'insufficient_funds'
  | 'content_rejected'
  | 'unknown';

export type SendResult =
  | { ok: true; providerMessageId: string; providerReference?: string }
  | { ok: false; code: ChannelErrorCode; retryable: boolean; message: string };

export type TestResult =
  | { ok: true; detail?: string }
  | { ok: false; code: ChannelErrorCode; message: string };

export type RawWebhook = {
  headers: Record<string, string | string[] | undefined>;
  body: string;
  url: string;
};

export type MessageStatusEvent = {
  providerReference: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'read';
  errorCode?: string;
  errorMessage?: string;
};

export type InboundSms = {
  from: string;
  to: string;
  body: string;
  providerMessageId: string;
};

export type InboundWhatsApp = {
  from: string;
  to: string;
  body: string;
  providerMessageId: string;
};

export type OutboundEmail = {
  to: string[];
  cc?: string[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: { filename: string; mimeType: string; bytes: Buffer }[];
};

export type MailboxTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
};

export type PushState = Record<string, unknown>;

export type SyncState = Record<string, unknown>;

export type MailboxChangeHint = { mailboxId: string; reason: 'push' | 'poll' };

export type SyncedEmail = {
  providerMessageId: string;
  providerThreadId: string;
  from: string;
  to: string[];
  subject: string;
  bodyText: string;
  receivedAt: Date;
};

export type VoiceInstructions = { markup: string };

export type CallStatusEvent = {
  providerCallId: string;
  status: string;
  durationSeconds?: number;
};

export type WhatsAppTemplate = {
  name: string;
  language: string;
  status: 'approved' | 'pending' | 'rejected';
};

export type AvailableNumber = {
  e164: string;
  type: 'mobile' | 'local' | 'toll_free';
  capabilities: { voice: boolean; sms: boolean; mms: boolean };
};

export type PurchasedNumber = {
  e164: string;
  providerSid: string;
};
