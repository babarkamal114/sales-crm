const ukDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const ukDateTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDateUk(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return ukDate.format(date);
}

export function formatDateTimeUk(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return ukDateTime.format(date);
}

/** Whole calendar days from `start` (inclusive) to `end` in the given IANA time zone. */
export function calendarDaysBetweenInTimeZone(
  start: Date,
  end: Date,
  timeZone: string,
): number {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const startDay = formatter.format(start);
  const endDay = formatter.format(end);
  const startMs = Date.parse(`${startDay}T00:00:00Z`);
  const endMs = Date.parse(`${endDay}T00:00:00Z`);
  return Math.round((endMs - startMs) / 86_400_000);
}
