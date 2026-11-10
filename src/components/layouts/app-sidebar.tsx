'use client';

import {
  Building2,
  Contact,
  Home,
  Kanban,
  ListTodo,
  MessageCircle,
  Rocket,
  Settings,
} from 'lucide-react';
import { NavItem } from '@/components/ui/navigation';
import { SponsoroBrandLogo } from '@/components/layouts/sponsoro-logo';
import { cn } from '@/lib/utils';

export type CrmNavKey =
  | 'dashboard'
  | 'getting-started'
  | 'opportunities'
  | 'contacts'
  | 'companies'
  | 'conversations'
  | 'tasks'
  | 'settings';

const iconClass = 'size-[18px] shrink-0';

const NAV_ITEMS: {
  key: CrmNavKey;
  href: string;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    key: 'dashboard',
    href: '/',
    label: 'Dashboard',
    icon: <Home className={iconClass} strokeWidth={1.9} />,
  },
  {
    key: 'getting-started',
    href: '/getting-started',
    label: 'Getting started',
    icon: <Rocket className={iconClass} strokeWidth={1.9} />,
  },
  {
    key: 'opportunities',
    href: '/opportunities',
    label: 'Opportunities',
    icon: <Kanban className={iconClass} strokeWidth={1.9} />,
  },
  {
    key: 'contacts',
    href: '/contacts',
    label: 'Contacts',
    icon: <Contact className={iconClass} strokeWidth={1.9} />,
  },
  {
    key: 'companies',
    href: '/companies',
    label: 'Companies',
    icon: <Building2 className={iconClass} strokeWidth={1.9} />,
  },
  {
    key: 'conversations',
    href: '/conversations',
    label: 'Conversations',
    icon: <MessageCircle className={iconClass} strokeWidth={1.9} />,
  },
  {
    key: 'tasks',
    href: '/tasks',
    label: 'Tasks',
    icon: <ListTodo className={iconClass} strokeWidth={1.9} />,
  },
];

const SETTINGS_NAV_ITEM = {
  key: 'settings' as const,
  href: '/settings',
  label: 'Settings',
  icon: <Settings className={iconClass} strokeWidth={1.9} />,
};

export function AppSidebar({
  open = false,
  activeNav = 'opportunities',
}: {
  open?: boolean;
  activeNav?: CrmNavKey;
}) {
  return (
    <aside
      className={cn(
        'z-50 flex w-[248px] shrink-0 flex-col rounded-xl3 border border-white bg-white',
        'max-lg:fixed max-lg:inset-y-3 max-lg:left-3 max-lg:h-[calc(100dvh-1.5rem)] max-lg:shadow-float',
        'max-lg:transition-transform max-lg:duration-200 max-lg:ease-out',
        'lg:sticky lg:top-7 lg:h-[calc(100dvh-3.5rem)] lg:shadow-panel',
        open ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-[110%]',
      )}
    >
      <div className="shrink-0 px-5 pt-5 pb-4">
        <SponsoroBrandLogo height={40} />
        <p className="mt-2 text-[11px] font-bold tracking-wide text-ink-500 uppercase">
          CRM
        </p>
      </div>

      <nav
        className="min-h-0 flex-1 space-y-1 overflow-y-auto scroll-thin px-3.5 pt-2 pb-2"
        aria-label="Main"
      >
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.key}
            href={item.href}
            active={activeNav === item.key}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </nav>

      <div className="shrink-0 border-t border-line/60 px-3.5 py-3">
        <NavItem
          href={SETTINGS_NAV_ITEM.href}
          active={activeNav === SETTINGS_NAV_ITEM.key}
          label={SETTINGS_NAV_ITEM.label}
          icon={SETTINGS_NAV_ITEM.icon}
        />
      </div>
    </aside>
  );
}
