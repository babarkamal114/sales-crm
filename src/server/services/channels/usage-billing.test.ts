import { describe, expect, it } from 'vitest';
import { defaultUnitPricePence } from '@/domain/channels/pricing';

describe('defaultUnitPricePence', () => {
  it('prices SMS segments', () => {
    expect(defaultUnitPricePence('sms', 'segment')).toBe(5);
  });

  it('prices WhatsApp messages', () => {
    expect(defaultUnitPricePence('whatsapp', 'message')).toBe(4);
  });
});
