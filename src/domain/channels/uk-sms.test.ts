import { describe, expect, it } from 'vitest';
import { isUkE164 } from '@/domain/channels/uk-sms';

describe('isUkE164', () => {
  it('accepts +44 numbers', () => {
    expect(isUkE164('+447700900123')).toBe(true);
  });

  it('rejects non-E.164 UK', () => {
    expect(isUkE164('07700900123')).toBe(false);
  });
});
