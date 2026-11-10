'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function CompanyLogoMark({
  name,
  domain,
  className,
}: {
  name: string;
  domain: string | null;
  className?: string;
}) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  const showFavicon = domain && !faviconFailed;
  const initials = initialsFromName(name);

  return (
    <span
      className={cn(
        'relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-100 text-[13px] font-bold text-brand-700',
        className,
      )}
    >
      {showFavicon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/v1/favicon?domain=${encodeURIComponent(domain)}`}
          alt=""
          className="size-full object-cover"
          onError={() => setFaviconFailed(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}
