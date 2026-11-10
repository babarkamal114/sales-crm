import type {
  AvailableNumber,
  CallStatusEvent,
  InboundSms,
  InboundWhatsApp,
  MailboxChangeHint,
  MailboxTokens,
  MessageStatusEvent,
  OutboundEmail,
  PurchasedNumber,
  PushState,
  RawWebhook,
  SendResult,
  SyncedEmail,
  SyncState,
  TestResult,
  VoiceInstructions,
  WhatsAppTemplate,
} from '@/channels/types';

export interface MailboxProvider {
  authorizeUrl?(state: string): string;
  exchangeCode?(code: string): Promise<MailboxTokens>;
  refresh(tokens: MailboxTokens): Promise<MailboxTokens>;
  send(msg: OutboundEmail): Promise<{ providerMessageId: string; providerThreadId: string }>;
  startPush(): Promise<PushState>;
  renewPush(state: PushState): Promise<PushState>;
  parsePush(raw: RawWebhook): MailboxChangeHint;
  syncChanges(state: SyncState): Promise<{ messages: SyncedEmail[]; next: SyncState }>;
  backfill(from: Date, matchAddresses: string[]): AsyncIterable<SyncedEmail>;
  revoke(): Promise<void>;
  testConnection(): Promise<TestResult>;
}

export interface SmsProvider {
  send(msg: {
    from: string;
    to: string;
    body: string;
    mediaUrls?: string[];
  }): Promise<SendResult>;
  parseInbound(raw: RawWebhook): InboundSms;
  parseStatus(raw: RawWebhook): MessageStatusEvent;
  verifySignature(raw: RawWebhook, secret: string): boolean;
  capabilities: { mms: boolean; alphaSender: boolean; ukNumbers: boolean };
  testConnection(): Promise<TestResult>;
}

export interface VoiceProvider {
  createClientToken(userId: string, ttlSeconds: number): Promise<string>;
  handleCallWebhook(raw: RawWebhook): VoiceInstructions;
  parseCallStatus(raw: RawWebhook): CallStatusEvent;
  verifySignature(raw: RawWebhook, secret: string): boolean;
  testConnection(): Promise<TestResult>;
}

export interface WhatsAppProvider {
  sendText(msg: { to: string; body: string }): Promise<SendResult>;
  sendTemplate(msg: {
    to: string;
    template: string;
    language: string;
    variables: string[];
  }): Promise<SendResult>;
  listTemplates(): Promise<WhatsAppTemplate[]>;
  parseInbound(raw: RawWebhook): InboundWhatsApp;
  parseStatus(raw: RawWebhook): MessageStatusEvent;
  verifySignature(raw: RawWebhook, secret: string): boolean;
  testConnection(): Promise<TestResult>;
}

export interface NumberProvider {
  search(q: {
    country: 'GB';
    type: 'mobile' | 'local';
    contains?: string;
    areaCode?: string;
  }): Promise<AvailableNumber[]>;
  purchase(e164: string, bundleSid: string): Promise<PurchasedNumber>;
  release(providerSid: string): Promise<void>;
}

export type ChannelBundle = {
  connectionId: string;
  orgId: string;
  mode: 'managed' | 'byo';
  provider: string;
  sms?: SmsProvider | undefined;
  voice?: VoiceProvider | undefined;
  whatsapp?: WhatsAppProvider | undefined;
  numbers?: NumberProvider | undefined;
};
