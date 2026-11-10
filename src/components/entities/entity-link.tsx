'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { EntityRef } from '@/lib/entities/types';
import { cn } from '@/lib/utils';

function hrefForEntity(ref: EntityRef, pathname: string): string {
  switch (ref.type) {
    case 'contact':
      if (pathname.startsWith('/contacts')) {
        return `/contacts?contact=${encodeURIComponent(ref.id)}`;
      }
      return `/contacts/${encodeURIComponent(ref.id)}`;
    case 'company':
      if (pathname.startsWith('/companies')) {
        return `/companies?company=${encodeURIComponent(ref.id)}`;
      }
      return `/companies/${encodeURIComponent(ref.id)}`;
    case 'opportunity':
      return `/opportunities?deal=${encodeURIComponent(ref.id)}`;
    default:
      return '/';
  }
}

export function EntityLink({
  entity,
  children,
  className,
  onNavigate,
}: {
  entity: EntityRef;
  children: React.ReactNode;
  className?: string;
  /** Called for in-app panel navigation (plain click). Return false to skip default. */
  onNavigate?: (entity: EntityRef) => boolean | void;
}) {
  const pathname = usePathname();
  const href = hrefForEntity(entity, pathname);

  return (
    <Link
      href={href}
      className={cn('font-semibold text-brand-600 hover:underline', className)}
      onClick={(event) => {
        event.stopPropagation();
        if (event.metaKey || event.ctrlKey || event.button === 1) return;
        if (onNavigate) {
          const handled = onNavigate(entity);
          if (handled === false) {
            event.preventDefault();
          }
        }
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {children}
    </Link>
  );
}
