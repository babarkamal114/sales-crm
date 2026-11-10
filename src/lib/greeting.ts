const ukDayMonth = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export function greetingForLocalHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatTodayUk(now: Date): string {
  return ukDayMonth.format(now);
}

export function firstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function dashboardSubtitle(input: {
  todayLabel: string;
  tasksDueToday: number;
  unreadMessages: number;
}): string {
  const parts: string[] = [input.todayLabel];
  const taskPart =
    input.tasksDueToday > 0
      ? `${input.tasksDueToday} task${input.tasksDueToday === 1 ? '' : 's'}`
      : null;
  const messagePart =
    input.unreadMessages > 0
      ? `${input.unreadMessages} unread message${input.unreadMessages === 1 ? '' : 's'}`
      : null;

  if (taskPart && messagePart) {
    parts.push(`You have ${taskPart} and ${messagePart}`);
  } else if (taskPart) {
    parts.push(`You have ${taskPart}`);
  } else if (messagePart) {
    parts.push(`You have ${messagePart}`);
  } else {
    parts.push("You're all caught up");
  }

  return parts.join(' · ');
}
