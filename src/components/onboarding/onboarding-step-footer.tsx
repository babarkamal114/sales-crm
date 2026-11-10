'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function onboardingFooterBarClassName(embedded?: boolean): string {
  return cn(
    'flex w-full flex-wrap items-center gap-3 border-t border-line/60 bg-soft/20 px-5 py-5 sm:px-7',
    embedded && '-mx-6 -mb-6 mt-8 border-x-0 border-b-0 sm:-mx-8 sm:-mb-8',
  );
}

type OnboardingStepFooterProps = {
  backHref: string | null;
  backLabel?: string;
  embedded?: boolean;
  children?: ReactNode;
};

export function OnboardingStepFooter({
  backHref,
  backLabel = 'Back',
  embedded = false,
  children,
}: OnboardingStepFooterProps) {
  return (
    <div className={onboardingFooterBarClassName(embedded)}>
      {backHref ? (
        <Button variant="secondary" size="default" className="min-h-11 gap-1.5 px-4" asChild>
          <Link href={backHref}>
            <ChevronLeft className="size-4 shrink-0" strokeWidth={2.25} aria-hidden />
            {backLabel}
          </Link>
        </Button>
      ) : null}
      {children ? (
        <div className={`flex flex-wrap items-center gap-3 ${backHref ? 'ml-auto' : ''}`}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
