import { describe, expect, it, beforeEach } from 'vitest';
import {
  createFakeSmsProvider,
  createFakeWhatsAppProvider,
  resetFakeChannelSim,
} from '@/channels/fake/fake-providers';
import type { RawWebhook } from '@/channels/types';

function raw(body: unknown): RawWebhook {
  return {
    body: JSON.stringify(body),
    url: 'https://example.com/webhook',
    headers: {},
  };
}

describe('Fake SMS webhook contract', () => {
  beforeEach(() => resetFakeChannelSim());

  it('parseInbound returns structured inbound SMS', () => {
    const sms = createFakeSmsProvider();
    const inbound = sms.parseInbound(
      raw({
        from: '+447700900123',
        to: '+447700900000',
        body: 'Hello',
        providerMessageId: 'SM123',
      }),
    );
    expect(inbound.from).toBe('+447700900123');
    expect(inbound.providerMessageId).toBe('SM123');
  });

  it('parseStatus maps delivery events', () => {
    const sms = createFakeSmsProvider();
    const status = sms.parseStatus(
      raw({
        providerReference: 'SM123',
        status: 'delivered',
      }),
    );
    expect(status.status).toBe('delivered');
  });

  it('verifySignature requires whsec_ prefix', () => {
    const sms = createFakeSmsProvider();
    expect(sms.verifySignature(raw({}), 'whsec_test')).toBe(true);
    expect(sms.verifySignature(raw({}), 'bad')).toBe(false);
  });
});

describe('Fake WhatsApp webhook contract', () => {
  beforeEach(() => resetFakeChannelSim());

  it('parseInbound returns WA payload', () => {
    const wa = createFakeWhatsAppProvider();
    const inbound = wa.parseInbound(
      raw({
        from: '+447700900123',
        to: '+447700900001',
        body: 'Hi',
        providerMessageId: 'WA1',
      }),
    );
    expect(inbound.body).toBe('Hi');
  });
});
