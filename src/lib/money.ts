const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

/** Format integer pence as GBP for display only. */
export function formatMoney(pence: number): string {
  return GBP.format(pence / 100);
}

/** Compact display for large KPI values; exact amount belongs in a tooltip. */
export function formatMoneyCompact(pence: number): string {
  const pounds = pence / 100;
  if (pounds >= 1_000_000) {
    const millions = pounds / 1_000_000;
    const rounded =
      millions >= 10
        ? Math.round(millions)
        : Math.round(millions * 10) / 10;
    return `£${rounded}m`;
  }
  return formatMoney(pence);
}
