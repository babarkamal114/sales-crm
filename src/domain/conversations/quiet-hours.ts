import type { SendingSettings } from '@/domain/conversations/types';

export function isInQuietHours(now: Date, orgSettings: SendingSettings): boolean {
  const qh = orgSettings.quietHours;
  if (!qh) return false;

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: orgSettings.timeZone,
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const day = dayMap[weekday] ?? 0;
  if (!qh.days.includes(day)) return false;

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const minutes = hour * 60 + minute;
  return qh.startMinutes <= qh.endMinutes
    ? minutes >= qh.startMinutes && minutes < qh.endMinutes
    : minutes >= qh.startMinutes || minutes < qh.endMinutes;
}
