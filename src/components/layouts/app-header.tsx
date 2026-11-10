'use client';

import { ExternalLink, Menu, Search } from 'lucide-react';
import { getComplianceAppUrl, getCrmAppUrl } from '@/lib/public-env';
import {
  headerBarControlClass,
  headerBarSearchClass,
} from '@/lib/layout/header-control-styles';
import { cn } from '@/lib/utils';

export type AppHeaderProps = {
  onOpenNav: () => void;
  title?: string;
  /** When true, show Sponsora-style search control instead of the page title. */
  showSearch?: boolean;
  searchPlaceholder?: string;
  onOpenSearch?: () => void;
  headerActions?: React.ReactNode;
  notificationsMenu?: React.ReactNode;
  profileMenu?: React.ReactNode;
};

export function AppHeader({
  onOpenNav,
  title,
  showSearch = false,
  searchPlaceholder = 'Search leads, companies, notes…',
  onOpenSearch,
  headerActions,
  notificationsMenu,
  profileMenu,
}: AppHeaderProps) {
  const complianceUrl = getComplianceAppUrl();
  const crmUrl = getCrmAppUrl();

  return (
    <header className="app-header-bar flex flex-wrap items-center gap-2.5 rounded-2xl border border-white/90 p-2 shadow-panel backdrop-blur-md sm:gap-3 sm:flex-nowrap sm:p-2.5">
      <button
        type="button"
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-2xl text-ink-500 transition-colors duration-150 hover:text-ink-900 motion-reduce:transition-none lg:hidden',
          headerBarControlClass,
        )}
        aria-label="Open navigation"
        onClick={onOpenNav}
      >
        <Menu className="size-5" strokeWidth={2} />
      </button>

      {showSearch ? (
        <div className="order-3 min-w-0 w-full sm:order-none sm:max-w-md sm:flex-1">
          <button
            type="button"
            onClick={onOpenSearch}
            className={cn(
              'flex h-11 w-full items-center gap-3 rounded-2xl px-4 text-left transition-colors duration-150 motion-reduce:transition-none',
              headerBarSearchClass,
            )}
            aria-label="Open search"
          >
            <Search className="size-[18px] shrink-0 text-ink-400" strokeWidth={1.9} />
            <span className="flex-1 truncate text-[13.5px] font-medium text-ink-400">
              {searchPlaceholder}
            </span>
            <kbd className="hidden shrink-0 items-center gap-0.5 rounded-lg bg-soft/80 px-2 py-1 text-[10.5px] font-semibold text-ink-400 md:flex">
              ⌘ K
            </kbd>
          </button>
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold text-ink-900">
            {title ?? 'CRM'}
          </p>
        </div>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5">
        <div className="hidden items-center gap-1 rounded-2xl border border-line bg-white p-1 shadow-chip md:flex">
          <a
            href={complianceUrl}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold text-ink-500 transition-colors hover:bg-soft hover:text-ink-900"
          >
            Compliance
            <ExternalLink className="size-3.5" strokeWidth={2} />
          </a>
          <a
            href={crmUrl}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold',
              'bg-brand-50 text-brand-700',
            )}
            aria-current="page"
          >
            CRM
          </a>
        </div>

        {headerActions}

        {notificationsMenu}

        {profileMenu}
      </div>
    </header>
  );
}

export function ContentPanel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl3 border border-white bg-white/70 p-4 shadow-panel backdrop-blur-sm sm:p-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
