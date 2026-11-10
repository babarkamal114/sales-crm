import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Callout({
  tone = 'amber',
  children,
  className,
}: {
  tone?: 'amber' | 'brand';
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        'flex gap-2.5 rounded-2xl px-3.5 py-3 text-[13px] leading-snug font-medium',
        tone === 'amber' && 'bg-amber-50 text-amber-700',
        tone === 'brand' && 'bg-brand-50 text-brand-700',
        className,
      )}
    >
      {children}
    </div>
  );
}
