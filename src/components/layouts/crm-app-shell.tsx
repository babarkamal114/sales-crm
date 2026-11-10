'use client';

import { usePathname } from 'next/navigation';
import { memo, useMemo } from 'react';
import { CreateDialogProvider } from '@/components/create-dialog';
import { GlobalNewMenu } from '@/components/layouts/global-new-menu';
import { AppShell } from '@/components/layouts/app-shell';
import { NotificationsMenu } from '@/components/layouts/notifications-menu';
import { ProfileMenu } from '@/components/layouts/profile-menu';
import type { CrmNavKey } from '@/components/layouts/app-sidebar';
import { toast } from '@/components/ui/sonner';

const TITLE_BY_NAV: Record<CrmNavKey, string> = {
  dashboard: 'Dashboard',
  'getting-started': 'Getting started',
  opportunities: 'Opportunities',
  contacts: 'Contacts',
  companies: 'Companies',
  conversations: 'Conversations',
  tasks: 'Tasks',
  settings: 'Settings',
};

function navFromPath(pathname: string): CrmNavKey {
  if (pathname === '/') return 'dashboard';
  if (pathname.startsWith('/getting-started')) return 'getting-started';
  if (pathname.startsWith('/contacts')) return 'contacts';
  if (pathname.startsWith('/companies')) return 'companies';
  if (pathname.startsWith('/conversations')) return 'conversations';
  if (pathname.startsWith('/tasks')) return 'tasks';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/opportunities')) return 'opportunities';
  return 'dashboard';
}

type CrmAppShellProps = {
  children: React.ReactNode;
  fullName: string;
  email: string;
  organisationName: string;
  role: string;
  userId: string;
};

function CrmAppShellInner({
  children,
  fullName,
  email,
  organisationName,
  role,
  userId,
}: CrmAppShellProps) {
  const pathname = usePathname();
  const activeNav = navFromPath(pathname);
  const isDashboard = activeNav === 'dashboard';

  const profileMenu = useMemo(
    () => (
      <ProfileMenu
        fullName={fullName}
        email={email}
        organisationName={organisationName}
        role={role}
      />
    ),
    [email, fullName, organisationName, role],
  );

  const headerActions = useMemo(() => <GlobalNewMenu />, []);

  const notificationsMenu = useMemo(
    () => (isDashboard ? <NotificationsMenu /> : undefined),
    [isDashboard],
  );

  return (
    <CreateDialogProvider userId={userId} role={role}>
      <AppShell
        activeNav={activeNav}
        {...(isDashboard
          ? {
              showSearch: true,
              searchPlaceholder: 'Search leads, companies, notes…',
              onOpenSearch: () => {
                toast.message('Search is coming soon');
              },
              notificationsMenu,
            }
          : { title: TITLE_BY_NAV[activeNav] })}
        headerActions={headerActions}
        profileMenu={profileMenu}
      >
        {children}
      </AppShell>
    </CreateDialogProvider>
  );
}

export const CrmAppShell = memo(CrmAppShellInner);
