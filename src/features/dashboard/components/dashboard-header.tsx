'use client';

import {
  dashboardSubtitle,
  firstName,
  formatTodayUk,
  greetingForLocalHour,
} from '@/lib/greeting';

export function DashboardHeader({
  fullName,
  tasksDueToday,
  unreadMessages,
}: {
  fullName: string;
  tasksDueToday: number;
  unreadMessages: number;
}) {
  const now = new Date();
  const greeting = greetingForLocalHour(now.getHours());

  return (
    <div className="mb-5">
      <h1 className="text-[24px] font-extrabold tracking-tight text-ink-900">
        {greeting}, {firstName(fullName)}
      </h1>
      <p className="mt-1 text-[13.5px] font-medium text-ink-500">
        {dashboardSubtitle({
          todayLabel: formatTodayUk(now),
          tasksDueToday,
          unreadMessages,
        })}
      </p>
    </div>
  );
}
