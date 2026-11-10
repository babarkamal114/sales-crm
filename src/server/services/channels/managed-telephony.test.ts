import { describe, expect, it, beforeEach } from 'vitest';
import { fakeSetAuthOk, resetFakeChannelSim } from '@/channels/fake/fake-providers';

describe('managed telephony (fake env)', () => {
  beforeEach(() => {
    process.env.CHANNELS_USE_FAKE = '1';
    resetFakeChannelSim();
    fakeSetAuthOk(true);
  });

  it('maps Twilio-like flow via fake SMS send', async () => {
    const { createFakeSmsProvider } = await import('@/channels/fake/fake-providers');
    const sms = createFakeSmsProvider();
    const result = await sms.send({
      from: '+447700900123',
      to: '+447700900456',
      body: 'Test from managed adapter',
    });
    expect(result.ok).toBe(true);
  });
});
