import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Inset({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-xl bg-soft p-4', className)} {...props} />
  );
}
