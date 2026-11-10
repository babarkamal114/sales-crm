'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { headerBarControlClass } from '@/lib/layout/header-control-styles';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

async function fetchNotifications() {
  const response = await fetch('/api/v1/notifications');
  if (!response.ok) return [];
  const data = (await response.json()) as { items: NotificationItem[] };
  return data.items;
}

async function markRead(notificationId: string) {
  await fetch(`/api/v1/notifications/${notificationId}/read`, { method: 'POST' });
}

export function NotificationsMenu() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  const { data: items = [], refetch } = useQuery({
    queryKey: ['org-notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 60_000,
  });

  const unreadCount = items.filter((item) => !item.readAt).length;

  useEffect(() => {
    setMounted(true);
  }, []);

  const trigger = (
    <button
      type="button"
      className={cn(
        'relative flex size-10 items-center justify-center rounded-2xl border text-ink-500 transition-colors duration-150 hover:text-ink-900 motion-reduce:transition-none sm:size-11',
        headerBarControlClass,
        open && 'border-brand-200 text-ink-900',
      )}
      aria-label="Notifications"
      aria-expanded={mounted ? open : false}
    >
      <Bell className="size-[18px]" strokeWidth={1.9} />
      {unreadCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </button>
  );

  if (!mounted) {
    return trigger;
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void refetch();
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-[min(100vw-2rem,360px)] p-0">
        <div className="border-b border-line px-4 py-3">
          <p className="text-[14px] font-bold text-ink-900">Notifications</p>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] font-medium text-ink-500">
            No notifications yet.
          </p>
        ) : (
          <ul className="max-h-[360px] overflow-y-auto py-1">
            {items.map((item) => {
              const content = (
                <>
                  <p className="text-[13px] font-bold text-ink-900">{item.title}</p>
                  <p className="mt-0.5 text-[12px] font-medium text-ink-500">{item.body}</p>
                </>
              );
              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className={cn(
                        'block px-4 py-3 transition-colors hover:bg-soft',
                        !item.readAt && 'bg-brand-50/50',
                      )}
                      onClick={() => {
                        if (!item.readAt) void markRead(item.id).then(() => refetch());
                        setOpen(false);
                      }}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="px-4 py-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
