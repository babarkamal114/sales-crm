import { describe, expect, it } from 'vitest';
import { mapProviderError } from '@/channels/errors';

describe('mapProviderError', () => {
  it('maps Twilio opt-out', () => {
    const r = mapProviderError('twilio', '21610', 'Unsubscribed');
    expect(r.code).toBe('recipient_opted_out');
    expect(r.retryable).toBe(false);
  });

  it('maps Twilio auth failure', () => {
    const r = mapProviderError('twilio', '20003', 'Auth');
    expect(r.code).toBe('auth_failed');
  });

  it('falls back to unknown', () => {
    const r = mapProviderError('twilio', '99999', 'Weird');
    expect(r.code).toBe('unknown');
    expect(r.retryable).toBe(true);
  });

  it('maps Meta rate limit', () => {
    const r = mapProviderError('meta', '131047', 'Limit');
    expect(r.code).toBe('rate_limited');
    expect(r.retryable).toBe(true);
  });
});
