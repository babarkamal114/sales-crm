import 'server-only';

const TIME_ZONE = 'Europe/London';

function ymdInLondon(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function addDays(ymd: string, days: number): string {
  const base = new Date(`${ymd}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function endOfMonthYmd(ymd: string): string {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(5, 7));
  const last = new Date(Date.UTC(year, month, 0));
  return last.toISOString().slice(0, 10);
}

export type CloseDateRange = { from: string; to: string } | null;

export function closeDateRangeForWindow(
  window: 'all' | '30d' | '90d' | 'month',
  now = new Date(),
): CloseDateRange {
  if (window === 'all') return null;

  const today = ymdInLondon(now);
  if (window === '30d') {
    return { from: today, to: addDays(today, 30) };
  }
  if (window === '90d') {
    return { from: today, to: addDays(today, 90) };
  }
  const monthStart = `${today.slice(0, 7)}-01`;
  return { from: monthStart, to: endOfMonthYmd(today) };
}
