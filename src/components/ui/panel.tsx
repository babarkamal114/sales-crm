import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Panel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl3 border border-white bg-white/70 p-4 shadow-panel backdrop-blur-sm sm:p-6',
        className,
      )}
      {...props}
    />
  );
}
