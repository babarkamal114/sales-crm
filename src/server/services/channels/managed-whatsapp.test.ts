import { describe, expect, it, beforeEach } from 'vitest';
import { isManagedWhatsAppEnabled } from '@/domain/channels/feature-flags';

describe('isManagedWhatsAppEnabled', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env, NODE_ENV: 'test' };
    delete process.env.CHANNELS_MANAGED_WHATSAPP;
    delete process.env.CHANNELS_USE_FAKE;
  });

  it('is off by default in test', () => {
    expect(isManagedWhatsAppEnabled()).toBe(false);
  });

  it('respects CHANNELS_MANAGED_WHATSAPP=1', () => {
    process.env.CHANNELS_MANAGED_WHATSAPP = '1';
    expect(isManagedWhatsAppEnabled()).toBe(true);
  });
});
