/**
 * Channels scenario matrix (Phase 8) — unit-level pins for H1–H14 where behaviour is pure/domain.
 * See docs/channels/phase-8-scenarios.md for full matrix + E2E gaps.
 */
import { describe, expect, it } from 'vitest';
import { ChannelNotConfiguredError } from '@/channels/registry';
import { mapProviderError } from '@/channels/errors';
import { isManagedWhatsAppEnabled } from '@/domain/channels/feature-flags';
import { defaultUnitPricePence } from '@/domain/channels/pricing';
import { isUkE164 } from '@/domain/channels/uk-sms';
import { canSend } from '@/domain/conversations/can-send';
import type { SendingSettings } from '@/domain/conversations/types';
import { extractEmailAddress } from '@/server/integrations/google-mailbox-client';

const baseContact = {
  email: 'lead@example.com',
  phoneE164: '+447700900123',
  recipientType: 'individual' as const,
  restricted: false,
};

const baseConsent = [
  { channel: 'email' as const, dnd: false, marketingConsent: 'granted' as const },
  { channel: 'sms' as const, dnd: false, marketingConsent: 'granted' as const },
  { channel: 'whatsapp' as const, dnd: false, marketingConsent: 'granted' as const },
];

const connectedSettings: SendingSettings = {
  timeZone: 'Europe/London',
  emailDomainVerified: true,
  smsConnected: true,
  whatsappConnected: true,
};

describe('H1 contact-only sync helpers', () => {
  it('extracts contact email from From header for direction checks', () => {
    expect(extractEmailAddress('Pat <pat@corp.com>')).toBe('pat@corp.com');
  });
});

describe('H5 managed SMS UK gate', () => {
  it.each([
    ['+447700900123', true],
    ['+441234567890', true],
    ['+15551234567', false],
    ['07700900123', false],
    [null, false],
  ] as const)('isUkE164(%s) → %s', (phone, ok) => {
    expect(isUkE164(phone)).toBe(ok);
  });
});

describe('H8 spend limit composer gate', () => {
  it('blocks SMS when managed spend is paused', () => {
    const result = canSend({
      channel: 'sms',
      purpose: 'conversation',
      contact: baseContact,
      consent: baseConsent,
      conversation: { lastInboundWhatsAppAt: null, waWindowExpiresAt: null },
      now: new Date('2026-06-15T12:00:00Z'),
      orgSettings: { ...connectedSettings, managedSpendPaused: true },
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/spend limit/i);
  });

  it('warns at 80% without blocking when alert flag set', () => {
    const result = canSend({
      channel: 'sms',
      purpose: 'conversation',
      contact: baseContact,
      consent: baseConsent,
      conversation: { lastInboundWhatsAppAt: null, waWindowExpiresAt: null },
      now: new Date('2026-06-15T12:00:00Z'),
      orgSettings: {
        ...connectedSettings,
        managedSpendAlert: true,
        managedSpendPaused: false,
      },
    });
    expect(result.allowed).toBe(true);
  });
});

describe('H9 email mailbox gate copy', () => {
  it('points to Channels when mailbox not connected', () => {
    const result = canSend({
      channel: 'email',
      purpose: 'conversation',
      contact: baseContact,
      consent: baseConsent,
      conversation: { lastInboundWhatsAppAt: null, waWindowExpiresAt: null },
      now: new Date(),
      orgSettings: { ...connectedSettings, emailDomainVerified: false },
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Channels/i);
  });
});

describe('H10 fail-closed provider errors', () => {
  it('maps unknown google errors without retry by default', () => {
    const mapped = mapProviderError('google', 'google_token_invalid', 'Token expired');
    expect(mapped.code).toBe('unknown');
    expect(mapped.message).toBe('Token expired');
  });

  it('exposes NOT_CONFIGURED class for registry', () => {
    const err = new ChannelNotConfiguredError('sms');
    expect(err.code).toBe('NOT_CONFIGURED');
  });
});

describe('H11 idempotent usage pricing', () => {
  it('uses stable default unit prices', () => {
    expect(defaultUnitPricePence('sms', 'segment')).toBeGreaterThan(0);
    expect(defaultUnitPricePence('whatsapp', 'message')).toBeGreaterThan(0);
  });
});

describe('H12 managed WhatsApp feature flag', () => {
  const env = process.env;

  it('is off unless explicitly enabled', () => {
    process.env = { ...env, NODE_ENV: 'test' };
    delete process.env.CHANNELS_MANAGED_WHATSAPP;
    delete process.env.CHANNELS_USE_FAKE;
    expect(isManagedWhatsAppEnabled()).toBe(false);
  });
});

describe('H13 BYO vs managed (connection copy)', () => {
  it('blocks WhatsApp when not connected', () => {
    const result = canSend({
      channel: 'whatsapp',
      purpose: 'conversation',
      contact: baseContact,
      consent: baseConsent,
      conversation: { lastInboundWhatsAppAt: null, waWindowExpiresAt: null },
      now: new Date(),
      orgSettings: { ...connectedSettings, whatsappConnected: false },
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/Channels/i);
  });
});
