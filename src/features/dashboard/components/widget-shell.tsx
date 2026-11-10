'use client';

import type { ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonBlock } from '@/components/ui/skeleton-patterns';
import { cn } from '@/lib/utils';

export function WidgetShell({
  title,
  subtitle,
  action,
  isLoading,
  isError,
  onRetry,
  unavailable,
  unavailableMessage = 'Coming soon',
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  unavailable?: boolean;
  unavailableMessage?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('border-line/60 shadow-panel', className)}>
      <CardHeader className="items-start gap-2">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-[14px]">{title}</CardTitle>
          {subtitle ? (
            <p className="mt-0.5 text-[11.5px] font-medium text-ink-400">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ? (
          <div className="shrink-0 [&_a]:text-[12.5px] [&_a]:font-bold [&_a]:text-brand-600 [&_a]:hover:text-brand-700 [&_a]:hover:no-underline">
            {action}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label={`Loading ${title}`}>
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
        ) : null}

        {!isLoading && isError ? (
          <ErrorState
            title={`Could not load ${title.toLowerCase()}`}
            description="Try again in a moment."
            {...(onRetry ? { onRetry } : {})}
          />
        ) : null}

        {!isLoading && !isError && unavailable ? (
          <p className="rounded-xl border border-line bg-soft/70 px-4 py-6 text-center text-[13px] font-medium text-ink-500">
            {unavailableMessage}
          </p>
        ) : null}

        {!isLoading && !isError && !unavailable ? children : null}
      </CardContent>
    </Card>
  );
}

