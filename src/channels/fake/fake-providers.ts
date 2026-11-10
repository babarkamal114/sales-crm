import type {
  MailboxProvider,
  NumberProvider,
  SmsProvider,
  VoiceProvider,
  WhatsAppProvider,
} from '@/channels/interfaces';
import type {
  InboundSms,
  InboundWhatsApp,
  MailboxChangeHint,
  MessageStatusEvent,
  OutboundEmail,
  PushState,
  RawWebhook,
  SyncState,
  SyncedEmail,
  TestResult,
  VoiceInstructions,
} from '@/channels/types';

export type FakeSimulateState = {
  inboundSms: InboundSms[];
  inboundWa: InboundWhatsApp[];
  failNextSend: boolean;
  authOk: boolean;
};

const defaultSim: FakeSimulateState = {
  inboundSms: [],
  inboundWa: [],
  failNextSend: false,
  authOk: true,
};

let simState: FakeSimulateState = { ...defaultSim };

export function resetFakeChannelSim(): void {
  simState = { ...defaultSim, inboundSms: [], inboundWa: [] };
}

export function fakeSimulateInboundSms(msg: InboundSms): void {
  simState.inboundSms.push(msg);
}

export function fakeSimulateInboundWhatsApp(msg: InboundWhatsApp): void {
  simState.inboundWa.push(msg);
}

export function fakeSetAuthOk(ok: boolean): void {
  simState.authOk = ok;
}

export function fakeSetFailNextSend(fail: boolean): void {
  simState.failNextSend = fail;
}

export function createFakeSmsProvider(): SmsProvider {
  return {
    capabilities: { mms: true, alphaSender: true, ukNumbers: true },
    async send(msg) {
      if (!simState.authOk) {
        return {
          ok: false,
          code: 'auth_failed',
          retryable: false,
          message: 'Fake credentials rejected',
        };
      }
      if (simState.failNextSend) {
        simState.failNextSend = false;
        return {
          ok: false,
          code: 'provider_unavailable',
          retryable: true,
          message: 'Fake transient failure',
        };
      }
      if (msg.body.trim().toUpperCase() === 'STOP') {
        return {
          ok: false,
          code: 'recipient_opted_out',
          retryable: false,
          message: 'Recipient opted out',
        };
      }
      return { ok: true, providerMessageId: `fake_sms_${Date.now()}` };
    },
    parseInbound(raw: RawWebhook): InboundSms {
      const data = JSON.parse(raw.body) as InboundSms;
      return data;
    },
    parseStatus(raw: RawWebhook): MessageStatusEvent {
      return JSON.parse(raw.body) as MessageStatusEvent;
    },
    verifySignature(_raw, secret) {
      return Boolean(secret?.startsWith('whsec_'));
    },
    async testConnection(): Promise<TestResult> {
      return simState.authOk
        ? { ok: true, detail: 'Fake SMS OK' }
        : { ok: false, code: 'auth_failed', message: 'Fake auth failed' };
    },
  };
}

export function createFakeVoiceProvider(): VoiceProvider {
  return {
    async createClientToken(userId, ttlSeconds) {
      return `fake_voice_${userId}_${ttlSeconds}`;
    },
    handleCallWebhook(): VoiceInstructions {
      return { markup: '<Response><Say>Fake call</Say></Response>' };
    },
    parseCallStatus(raw: RawWebhook) {
      return JSON.parse(raw.body) as { providerCallId: string; status: string };
    },
    verifySignature(_raw, secret) {
      return Boolean(secret?.startsWith('whsec_'));
    },
    async testConnection() {
      return simState.authOk
        ? { ok: true }
        : { ok: false, code: 'auth_failed', message: 'Fake voice auth failed' };
    },
  };
}

export function createFakeWhatsAppProvider(): WhatsAppProvider {
  return {
    async sendText(_msg) {
      if (!simState.authOk) {
        return { ok: false, code: 'auth_failed', retryable: false, message: 'Fake WA auth failed' };
      }
      return { ok: true, providerMessageId: `fake_wa_${Date.now()}` };
    },
    async sendTemplate() {
      return { ok: true, providerMessageId: `fake_wa_tpl_${Date.now()}` };
    },
    async listTemplates() {
      return [{ name: 'hello_world', language: 'en_GB', status: 'approved' as const }];
    },
    parseInbound(raw: RawWebhook) {
      return JSON.parse(raw.body) as InboundWhatsApp;
    },
    parseStatus(raw: RawWebhook) {
      return JSON.parse(raw.body) as MessageStatusEvent;
    },
    verifySignature(_raw, secret) {
      return secret === 'fake_meta_secret';
    },
    async testConnection() {
      return simState.authOk
        ? { ok: true }
        : { ok: false, code: 'auth_failed', message: 'Fake Meta auth failed' };
    },
  };
}

export function createFakeNumberProvider(): NumberProvider {
  return {
    async search(q) {
      return [
        {
          e164: q.type === 'mobile' ? '+447700900123' : '+441234567890',
          type: q.type,
          capabilities: { voice: true, sms: q.type === 'mobile', mms: false },
        },
      ];
    },
    async purchase(e164) {
      return { e164, providerSid: `PN_fake_${e164.replace(/\D/g, '')}` };
    },
    async release() {
      /* noop */
    },
  };
}

export function createFakeMailboxProvider(mailboxId: string): MailboxProvider {
  return {
    authorizeUrl(state) {
      return `https://fake.mailbox/authorize?state=${encodeURIComponent(state)}`;
    },
    async exchangeCode(code) {
      return { accessToken: `fake_at_${code}`, refreshToken: 'fake_rt', expiresAt: new Date(Date.now() + 3600_000) };
    },
    async refresh(tokens) {
      return { ...tokens, accessToken: `fake_at_refreshed_${Date.now()}` };
    },
    async send(_msg: OutboundEmail) {
      return {
        providerMessageId: `fake_mail_${Date.now()}`,
        providerThreadId: `fake_thread_${mailboxId}`,
      };
    },
    async startPush() {
      return { mailboxId } satisfies PushState;
    },
    async renewPush(state) {
      return state;
    },
    parsePush(): MailboxChangeHint {
      return { mailboxId, reason: 'push' };
    },
    async syncChanges(_state: SyncState) {
      return { messages: [] as SyncedEmail[], next: {} };
    },
    async *backfill() {
      /* empty */
    },
    async revoke() {
      /* noop */
    },
    async testConnection() {
      return simState.authOk
        ? { ok: true }
        : { ok: false, code: 'auth_failed', message: 'Mailbox reconnect required' };
    },
  };
}
