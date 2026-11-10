export function formatOpportunityValue(
  valuePence: number | null,
  currency = 'GBP',
): string {
  if (valuePence == null) return '—';
  const amount = valuePence / 100;
  if (currency === 'GBP') {
    if (amount >= 1_000_000) {
      return `£${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
    }
    if (amount >= 1_000) {
      return `£${(amount / 1_000).toFixed(amount >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`;
    }
    return `£${amount.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`;
  }
  return `${amount.toLocaleString('en-GB')} ${currency}`;
}

export function formatExactValueTooltip(valuePence: number | null, currency: string): string {
  if (valuePence == null) return 'No value set';
  return `${(valuePence / 100).toLocaleString('en-GB', { style: 'currency', currency })}`;
}
