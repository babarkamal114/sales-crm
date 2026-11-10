'use client';

import { memo, Suspense, useCallback, useEffect, useState } from 'react';
import { AppHeader, type AppHeaderProps } from '@/components/layouts/app-header';
import { CrmContentLoading } from '@/components/layouts/crm-content-loading';
import {
  AppSidebar,
  type CrmNavKey,
} from '@/components/layouts/app-sidebar';

type AppShellProps = {
  children: React.ReactNode;
  activeNav?: CrmNavKey;
} & Omit<AppHeaderProps, 'onOpenNav'>;

const MemoAppSidebar = memo(AppSidebar);

export function AppShell({
  children,
  activeNav = 'dashboard',
  title,
  showSearch,
  searchPlaceholder,
  onOpenSearch,
  headerActions,
  notificationsMenu,
  profileMenu,
}: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const openNav = useCallback(() => setNavOpen(true), []);
  const closeNav = useCallback(() => setNavOpen(false), []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeNav();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeNav]);

  return (
    <div className="app-shell min-h-full p-3 sm:p-5 lg:p-7">
      <div className="mx-auto flex max-w-[1560px] items-start gap-5">
        <MemoAppSidebar open={navOpen} activeNav={activeNav} />

        <button
          type="button"
          aria-label="Close navigation"
          className={`fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-[2px] lg:hidden ${
            navOpen ? 'block' : 'hidden'
          }`}
          onClick={closeNav}
        />

        <main className="min-w-0 flex-1">
          <div className="sticky top-3 z-30 mb-5 w-full sm:top-5 lg:top-7">
            <AppHeader
              onOpenNav={openNav}
              {...(title === undefined ? {} : { title })}
              showSearch={showSearch ?? false}
              {...(searchPlaceholder === undefined
                ? {}
                : { searchPlaceholder })}
              {...(onOpenSearch === undefined ? {} : { onOpenSearch })}
              {...(headerActions === undefined ? {} : { headerActions })}
              {...(notificationsMenu === undefined ? {} : { notificationsMenu })}
              {...(profileMenu === undefined ? {} : { profileMenu })}
            />
          </div>
          <Suspense fallback={<CrmContentLoading />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}
