import { describe, expect, it, beforeEach } from 'vitest';
import {
  createFakeSmsProvider,
  fakeSetAuthOk,
  fakeSetFailNextSend,
  resetFakeChannelSim,
} from '@/channels/fake/fake-providers';

describe('Fake SMS provider', () => {
  beforeEach(() => {
    resetFakeChannelSim();
    fakeSetAuthOk(true);
  });

  it('sends successfully', async () => {
    const sms = createFakeSmsProvider();
    const result = await sms.send({ from: '+441', to: '+442', body: 'Hello' });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.providerMessageId).toMatch(/^fake_sms_/);
  });

  it('returns auth_failed when credentials bad', async () => {
    fakeSetAuthOk(false);
    const sms = createFakeSmsProvider();
    const result = await sms.send({ from: '+441', to: '+442', body: 'Hi' });
    expect(result).toEqual({
      ok: false,
      code: 'auth_failed',
      retryable: false,
      message: 'Fake credentials rejected',
    });
  });

  it('verifies webhook secret prefix', () => {
    const sms = createFakeSmsProvider();
    expect(sms.verifySignature({ headers: {}, body: '', url: '' }, 'whsec_abc')).toBe(true);
    expect(sms.verifySignature({ headers: {}, body: '', url: '' }, 'bad')).toBe(false);
  });

  it('retries on simulated transient failure', async () => {
    fakeSetFailNextSend(true);
    const sms = createFakeSmsProvider();
    const first = await sms.send({ from: '+441', to: '+442', body: 'x' });
    expect(first.ok).toBe(false);
    if (!first.ok) {
      expect(first.code).toBe('provider_unavailable');
      expect(first.retryable).toBe(true);
    }
    const second = await sms.send({ from: '+441', to: '+442', body: 'x' });
    expect(second.ok).toBe(true);
  });
});
