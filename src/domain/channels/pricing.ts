import type { ChannelKind } from '@/channels/types';

/** Retail price in pence (managed mode billing). */
export function defaultUnitPricePence(channel: ChannelKind, unit: string): number {
  if (channel === 'sms' && unit === 'segment') return 5;
  if (channel === 'whatsapp' && unit === 'message') return 4;
  if (channel === 'voice' && unit === 'minute') return 8;
  if (unit === 'number_rental') return 150;
  return 0;
}

export const DEFAULT_MONTHLY_SPEND_LIMIT_PENCE = 50_000;
