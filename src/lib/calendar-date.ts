export interface ParsedIsoDate {
  year: number;
  month: number;
  day: number;
}

export interface CalendarCell {
  iso: string | null;
  day: number | null;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const CALENDAR_WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

export const CALENDAR_MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseIsoDate(value: string | null | undefined): ParsedIsoDate | null {
  if (!value) {
    return null;
  }

  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function formatIsoDateLabel(value: string | null | undefined): string {
  const parsed = parseIsoDate(value);
  if (!parsed) {
    return "";
  }

  const date = new Date(parsed.year, parsed.month - 1, parsed.day);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function compareIsoDates(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

export function isIsoDateInRange(
  value: string,
  min?: string,
  max?: string,
): boolean {
  if (min && compareIsoDates(value, min) < 0) {
    return false;
  }

  if (max && compareIsoDates(value, max) > 0) {
    return false;
  }

  return true;
}

export function getCalendarYearRange(input: {
  min?: string | undefined;
  max?: string | undefined;
  now?: Date | undefined;
}): { minYear: number; maxYear: number } {
  const now = input.now ?? new Date();
  const currentYear = now.getFullYear();

  const minYear = input.min ? (parseIsoDate(input.min)?.year ?? currentYear - 100) : currentYear - 100;
  const maxYear = input.max ? (parseIsoDate(input.max)?.year ?? currentYear + 25) : currentYear + 25;

  return {
    minYear: Math.min(minYear, maxYear),
    maxYear: Math.max(minYear, maxYear),
  };
}

export function buildCalendarMonthGrid(year: number, month: number): CalendarCell[] {
  const firstDay = new Date(year, month - 1, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < startOffset; index += 1) {
    cells.push({ iso: null, day: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      iso: toIsoDate(year, month, day),
      day,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ iso: null, day: null });
  }

  return cells;
}

export function todayIsoDate(now: Date = new Date()): string {
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * The calendar date a moment falls on in the UK.
 *
 * Statutory deadlines are calendar dates, not instants, so every `Date` that
 * crosses into date arithmetic has to be resolved in one explicit timezone —
 * `toISOString()` silently answers for UTC and shifts the day on any other server.
 */
export function toLondonIsoDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error("Cannot resolve a calendar date from an invalid Date.");
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const lookup = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${lookup("year")}-${lookup("month")}-${lookup("day")}`;
}

/** A `Date` at local midnight on the given calendar date, for display formatting. */
export function fromIsoDateAtLocalMidnight(isoDate: string): Date {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  return new Date(parsed.year, parsed.month - 1, parsed.day);
}

/** UTC arithmetic so the result never shifts with the server's timezone. */
export function addDaysToIsoDate(isoDate: string, days: number): string {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  const shifted = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days));

  return toIsoDate(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

/** Whole calendar days from `from` to `to`, negative when `to` is earlier. */
export function differenceInIsoDays(from: string, to: string): number {
  const start = parseIsoDate(from);
  const end = parseIsoDate(to);

  if (!start || !end) {
    throw new Error(`Invalid ISO date range: ${from} to ${to}`);
  }

  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);

  return Math.round((endUtc - startUtc) / MILLISECONDS_PER_DAY);
}

/** 0 = Sunday … 6 = Saturday, read in UTC to stay timezone-independent. */
export function getIsoDateWeekday(isoDate: string): number {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
}

export function addMonthsToIsoDate(isoDate: string, months: number): string {
  const parsed = parseIsoDate(isoDate);
  if (!parsed) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  const targetMonthIndex = parsed.month - 1 + months;
  const targetYear = parsed.year + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, normalizedMonthIndex + 1, 0).getDate();
  const day = Math.min(parsed.day, lastDayOfTargetMonth);

  return toIsoDate(targetYear, normalizedMonthIndex + 1, day);
}

export function minIsoDate(...dates: Array<string | undefined>): string | undefined {
  const valid = dates.filter((value): value is string => Boolean(value));
  if (valid.length === 0) {
    return undefined;
  }

  return valid.reduce((earliest, candidate) =>
    compareIsoDates(candidate, earliest) < 0 ? candidate : earliest,
  );
}

export function clampIsoDateToRange(
  value: string,
  range: { min: string; max?: string },
): string {
  if (!value) {
    return value;
  }

  if (compareIsoDates(value, range.min) < 0) {
    return range.min;
  }

  if (range.max && compareIsoDates(value, range.max) > 0) {
    return range.max;
  }

  return value;
}

/**
 * A follow-up right-to-work check is only due shortly before the worker's
 * permission ends, so the reminder may be set any time up to that date — a
 * worker with three years of leave must not be forced into a reminder months
 * away that is used up long before the recheck actually matters.
 *
 * `max` is undefined while the permission end date is still unknown, which
 * means no upper bound rather than an arbitrary one.
 */
export function resolveRecheckReminderBounds(input: {
  now?: Date;
  permissionExpiryDate?: string;
}): { min: string; max?: string } {
  const min = todayIsoDate(input.now);
  const permissionExpiry = input.permissionExpiryDate?.trim() || undefined;

  if (permissionExpiry && compareIsoDates(permissionExpiry, min) < 0) {
    return { min, max: min };
  }

  if (permissionExpiry === undefined) {
    return { min };
  }

  return { min, max: permissionExpiry };
}

/** List B Group 2 follow-up must fall within 6 months of the initial check. */
export function resolveFollowUpCheckBounds(input: {
  checkDate?: string;
  now?: Date;
}): { min: string; max: string } {
  const min = input.checkDate?.trim() || todayIsoDate(input.now);
  return {
    min,
    max: addMonthsToIsoDate(min, 6),
  };
}

export function clampViewMonth(input: {
  year: number;
  month: number;
  min?: string | undefined;
  max?: string | undefined;
}): { year: number; month: number } {
  let { year, month } = input;

  if (input.min) {
    const minDate = parseIsoDate(input.min);
    if (minDate && (year < minDate.year || (year === minDate.year && month < minDate.month))) {
      year = minDate.year;
      month = minDate.month;
    }
  }

  if (input.max) {
    const maxDate = parseIsoDate(input.max);
    if (maxDate && (year > maxDate.year || (year === maxDate.year && month > maxDate.month))) {
      year = maxDate.year;
      month = maxDate.month;
    }
  }

  return { year, month };
}
