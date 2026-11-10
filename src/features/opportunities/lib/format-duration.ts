export function formatDurationSeconds(totalSeconds: number | null): string {
  if (totalSeconds == null || totalSeconds <= 0) return '—';
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  if (days >= 1) return `${days}d${hours > 0 ? ` ${hours}h` : ''}`;
  if (hours >= 1) return `${hours}h`;
  const minutes = Math.max(1, Math.floor(totalSeconds / 60));
  return `${minutes}m`;
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
