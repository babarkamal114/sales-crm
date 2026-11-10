import { describe, expect, it } from 'vitest';
import { canContact } from '@/domain/conversations/can-contact';
import { canSend } from '@/domain/conversations/can-send';
import { emailThreadKey } from '@/domain/conversations/email-thread-key';
import { detectOptIn, detectOptOut } from '@/domain/conversations/opt-out';
import { parseMentions } from '@/domain/conversations/parse-mentions';
import { previewText } from '@/domain/conversations/preview-text';
import { renderTemplate } from '@/domain/conversations/render-template';
import { smsSegments } from '@/domain/conversations/sms-segments';
import type { SendingSettings } from '@/domain/conversations/types';
import { waitingSince } from '@/domain/conversations/waiting-since';
import { waWindowExpiry, waWindowOpen } from '@/domain/conversations/wa-window';

const baseContact = {
  email: 'a@example.com',
  phoneE164: '+447700900123',
  recipientType: 'individual' as const,
  restricted: false,
};

const baseConsent = [
  { channel: 'email' as const, dnd: false, marketingConsent: 'granted' as const },
  { channel: 'sms' as const, dnd: false, marketingConsent: 'granted' as const },
  { channel: 'whatsapp' as const, dnd: false, marketingConsent: 'granted' as const },
  { channel: 'call' as const, dnd: false, marketingConsent: 'granted' as const },
];

const orgSettings: SendingSettings = {
  timeZone: 'Europe/London',
  emailDomainVerified: true,
  smsConnected: true,
  whatsappConnected: true,
  quietHours: {
    startMinutes: 21 * 60,
    endMinutes: 8 * 60,
    days: [0, 1, 2, 3, 4, 5, 6],
  },
};

describe('detectOptOut / detectOptIn', () => {
  it('matches whole-message keywords case-insensitively', () => {
    expect(detectOptOut('  stop  ')).toBe(true);
    expect(detectOptOut('Please stop now')).toBe(false);
    expect(detectOptIn('START')).toBe(true);
  });
});

describe('smsSegments', () => {
  it('uses GSM-7 for ASCII', () => {
    expect(smsSegments('hello').segments).toBe(1);
    expect(smsSegments('hello').encoding).toBe('gsm-7');
  });

  it('uses UCS-2 for emoji and counts multipart', () => {
    const text = `${'x'.repeat(280)}😀`;
    const info = smsSegments(text);
    expect(info.encoding).toBe('ucs-2');
    expect(info.segments).toBeGreaterThanOrEqual(5);
  });
});

describe('waitingSince', () => {
  it('returns first inbound after last outbound', () => {
    const t1 = new Date('2026-01-01T10:00:00Z');
    const t2 = new Date('2026-01-01T11:00:00Z');
    const t3 = new Date('2026-01-01T12:00:00Z');
    expect(
      waitingSince([
        { direction: 'inbound', channel: 'email', createdAt: t1 },
        { direction: 'outbound', channel: 'email', createdAt: t2 },
        { direction: 'inbound', channel: 'sms', createdAt: t3 },
      ]),
    ).toEqual(t3);
  });

  it('returns null when last message is outbound', () => {
    const t1 = new Date('2026-01-01T10:00:00Z');
    const t2 = new Date('2026-01-01T11:00:00Z');
    expect(
      waitingSince([
        { direction: 'inbound', channel: 'email', createdAt: t1 },
        { direction: 'outbound', channel: 'email', createdAt: t2 },
      ]),
    ).toBeNull();
  });
});

describe('waWindowExpiry', () => {
  it('adds 24 hours', () => {
    const start = new Date('2026-06-01T12:00:00Z');
    const end = waWindowExpiry(start);
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('blocks free text one minute after expiry', () => {
    const last = new Date('2026-06-01T12:00:00Z');
    const now = new Date(last.getTime() + 24 * 60 * 60 * 1000 + 60_000);
    expect(waWindowOpen(last, now)).toBe(false);
  });
});

describe('previewText', () => {
  it('strips quotes and truncates', () => {
    const text = 'Hello there\n\nOn Tue, Bob wrote:\n> quoted';
    expect(previewText({ bodyText: text })).toBe('Hello there');
  });
});

describe('renderTemplate', () => {
  it('returns missing variables', () => {
    const result = renderTemplate({
      body: 'Hi {{first_name}} from {{company}}',
      vars: { first_name: 'Sam' },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.missing).toEqual(['company']);
  });
});

describe('parseMentions', () => {
  it('finds users by handle', () => {
    expect(
      parseMentions('Hey @sara check this', [{ id: 'u1', handle: 'sara' }]),
    ).toEqual(['u1']);
  });
});

describe('emailThreadKey', () => {
  it('prefers reply token', () => {
    expect(
      emailThreadKey({
        replyToken: 'abc123',
        inReplyTo: '<other@msg>',
        fromAddress: 'x@y.com',
      }),
    ).toEqual({ kind: 'reply_token', token: 'abc123' });
  });
});

describe('canContact', () => {
  it('blocks SMS when DND (STOP)', () => {
    const result = canContact({
      channel: 'sms',
      purpose: 'conversation',
      contact: baseContact,
      consent: baseConsent.map((c) =>
        c.channel === 'sms' ? { ...c, dnd: true } : c,
      ),
      now: new Date('2026-06-01T14:00:00Z'),
      orgSettings,
    });
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.message).toContain('STOP');
  });
});

describe('canSend', () => {
  it('returns template_only when WA window closed', () => {
    const last = new Date('2026-06-01T10:00:00Z');
    const now = new Date('2026-06-02T11:00:00Z');
    const result = canSend({
      channel: 'whatsapp',
      purpose: 'conversation',
      contact: baseContact,
      consent: baseConsent,
      conversation: {
        lastInboundWhatsAppAt: last,
        waWindowExpiresAt: waWindowExpiry(last),
      },
      now,
      orgSettings,
    });
    expect(result.mode).toBe('template_only');
    expect(result.allowed).toBe(true);
  });

  it('blocks when WhatsApp not connected', () => {
    const result = canSend({
      channel: 'whatsapp',
      purpose: 'conversation',
      contact: baseContact,
      consent: baseConsent,
      conversation: { lastInboundWhatsAppAt: null, waWindowExpiresAt: null },
      now: new Date(),
      orgSettings: { ...orgSettings, whatsappConnected: false },
    });
    expect(result.allowed).toBe(false);
    expect(result.mode).toBe('blocked');
  });
});
