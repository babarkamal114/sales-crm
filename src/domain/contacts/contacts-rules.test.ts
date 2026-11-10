import { describe, expect, it } from 'vitest';
import { canContactSummary } from '@/domain/contacts/consent';
import { displayName } from '@/domain/contacts/display-name';
import { findDuplicateKeys } from '@/domain/contacts/duplicates';
import { lifecycleAfter } from '@/domain/contacts/lifecycle';
import { mergeContacts } from '@/domain/contacts/merge';
import { detectPhoneType, normaliseEmail, normalisePhone } from '@/domain/contacts/normalise';

describe('normaliseEmail', () => {
  it('lowercases and trims', () => {
    expect(normaliseEmail('  Ada.Lovelace@Example.COM ')).toBe('ada.lovelace@example.com');
  });

  it('returns null for invalid', () => {
    expect(normaliseEmail('not-an-email')).toBeNull();
  });
});

describe('normalisePhone', () => {
  it('normalises UK mobile formats to the same E.164', () => {
    expect(normalisePhone('07700 900123')).toBe('+447700900123');
    expect(normalisePhone('+44 7700 900123')).toBe('+447700900123');
  });

  it('detects mobile type', () => {
    expect(detectPhoneType('+447700900123')).toBe('mobile');
  });
});

describe('findDuplicateKeys', () => {
  it('returns email and phone keys', () => {
    const keys = findDuplicateKeys({
      email: 'Ada@test.com',
      phoneE164: '07700900123',
      firstName: 'Ada',
      lastName: 'Test',
      companyId: null,
    });
    expect(keys.some((k) => k.kind === 'email' && k.value === 'ada@test.com')).toBe(true);
    expect(keys.some((k) => k.kind === 'phone' && k.value === '+447700900123')).toBe(true);
  });
});

describe('displayName', () => {
  it('falls back to email then phone', () => {
    expect(displayName({ firstName: '', lastName: '', email: 'a@b.com', phoneE164: '+441' })).toBe(
      'a@b.com',
    );
    expect(displayName({ firstName: '', lastName: '', email: null, phoneE164: '+441234' })).toBe(
      '+441234',
    );
    expect(displayName({ firstName: '', lastName: '', email: null, phoneE164: null })).toBe(
      'Unnamed contact',
    );
  });
});

describe('canContactSummary', () => {
  it('blocks when DND is on', () => {
    const summary = canContactSummary(
      {
        email: 'a@b.com',
        phoneE164: '+447700900123',
        recipientType: 'individual',
        restricted: false,
      },
      [{ channel: 'email', dnd: true, marketingConsent: 'granted' }],
    );
    expect(summary.email.allowed).toBe(false);
  });
});

describe('lifecycleAfter', () => {
  it('promotes to customer on win', () => {
    expect(lifecycleAfter('lead', { type: 'opportunity_won' })).toBe('customer');
  });
});

describe('mergeContacts', () => {
  it('keeps SMS DND if either record objected', () => {
    const base = {
      id: '1',
      firstName: 'A',
      lastName: 'One',
      email: 'a@test.com',
      phoneE164: null,
      jobTitle: null,
      companyId: null,
      ownerId: 'u1',
      lifecycle: 'lead',
      source: null,
      consent: [
        { channel: 'email' as const, dnd: false, marketingConsent: 'unknown' as const },
        { channel: 'sms' as const, dnd: false, marketingConsent: 'unknown' as const },
        { channel: 'whatsapp' as const, dnd: false, marketingConsent: 'unknown' as const },
        { channel: 'call' as const, dnd: false, marketingConsent: 'unknown' as const },
      ],
    };
    const secondary = {
      ...base,
      id: '2',
      consent: base.consent.map((row) =>
        row.channel === 'sms' ? { ...row, dnd: true, marketingConsent: 'denied' as const } : row,
      ),
    };
    const result = mergeContacts(base, secondary, {}, { opportunityIds: [], noteIds: [], taskIds: [] });
    const sms = result.consent.find((row) => row.channel === 'sms');
    expect(sms?.dnd).toBe(true);
    expect(sms?.marketingConsent).toBe('denied');
  });
});
