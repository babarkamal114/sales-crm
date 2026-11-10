import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';

const ORG_TZ = 'Europe/London';

function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = formatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: get('weekday'),
  };
}

function utcFromLocal(
  year: number,
  month: number,
  day: number,
  hour: number,
  timeZone: string,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
  const offsetFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: 'numeric',
    hourCycle: 'h23',
    timeZoneName: 'shortOffset',
  });
  const offsetPart = offsetFormatter
    .formatToParts(guess)
    .find((part) => part.type === 'timeZoneName')?.value;
  const match = offsetPart?.match(/GMT([+-]\d+)/);
  const offsetHours = match ? Number(match[1]) : 0;
  return new Date(Date.UTC(year, month - 1, day, hour - offsetHours, 0, 0));
}

function startOfMonth(year: number, month: number, timeZone: string): Date {
  return utcFromLocal(year, month, 1, 0, timeZone);
}

function addMonths(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function quarterStartMonth(month: number): number {
  return Math.floor((month - 1) / 3) * 3 + 1;
}

export function resolvePeriodBounds(
  period: DashboardFiltersInput['period'],
  now = new Date(),
  orgTimeZone = ORG_TZ,
): { periodStart: Date; periodEnd: Date; orgTimeZone: string } {
  const local = zonedParts(now, orgTimeZone);
  let periodStart: Date;
  let periodEnd: Date;

  switch (period) {
    case 'today': {
      periodStart = utcFromLocal(local.year, local.month, local.day, 0, orgTimeZone);
      periodEnd = utcFromLocal(local.year, local.month, local.day + 1, 0, orgTimeZone);
      break;
    }
    case 'week': {
      const weekdayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(
        local.weekday ?? 'Mon',
      );
      const mondayDay = local.day - (weekdayIndex >= 0 ? weekdayIndex : 0);
      periodStart = utcFromLocal(local.year, local.month, mondayDay, 0, orgTimeZone);
      periodEnd = utcFromLocal(local.year, local.month, mondayDay + 7, 0, orgTimeZone);
      break;
    }
    case 'month': {
      periodStart = startOfMonth(local.year, local.month, orgTimeZone);
      const next = addMonths(local.year, local.month, 1);
      periodEnd = startOfMonth(next.year, next.month, orgTimeZone);
      break;
    }
    case 'quarter': {
      const qMonth = quarterStartMonth(local.month);
      periodStart = startOfMonth(local.year, qMonth, orgTimeZone);
      const next = addMonths(local.year, qMonth, 3);
      periodEnd = startOfMonth(next.year, next.month, orgTimeZone);
      break;
    }
    default: {
      periodStart = startOfMonth(local.year, local.month, orgTimeZone);
      const next = addMonths(local.year, local.month, 1);
      periodEnd = startOfMonth(next.year, next.month, orgTimeZone);
    }
  }

  return { periodStart, periodEnd, orgTimeZone };
}

export function buildDashboardFilters(
  input: DashboardFiltersInput,
  now = new Date(),
): import('@/domain/dashboard/types').DashboardFilters {
  const { periodStart, periodEnd, orgTimeZone } = resolvePeriodBounds(
    input.period,
    now,
  );
  return {
    ...input,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    orgTimeZone,
  };
}
