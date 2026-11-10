export type OutboundMessagePayload = {
  orgId: string;
  messageId: string;
  channel: 'email' | 'sms' | 'whatsapp';
  to: string;
  subject?: string | null;
  bodyText: string;
  bodyHtml?: string | null;
  replyTo?: string | null;
};

export type ProviderSendResult =
  | { ok: true; providerMessageId: string; provider: string }
  | { ok: false; retryable: boolean; errorCode?: string; errorMessage: string };

export type MessagingProvider = {
  send(message: OutboundMessagePayload): Promise<ProviderSendResult>;
};
