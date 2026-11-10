'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { DashboardWelcomeResponse } from '@/domain/dashboard/types';

export function GettingStartedBanner({ welcome }: { welcome: DashboardWelcomeResponse }) {
  if (!welcome.showWelcome) return null;

  const progress = welcome.progress;
  const percent =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  return (
    <Card className="overflow-hidden border-brand-200/80 shadow-panel">
      <CardContent className="flex flex-col gap-4 bg-gradient-to-r from-brand-50/90 via-white to-white p-0 sm:flex-row sm:items-stretch">
        <div className="flex min-w-0 flex-1 flex-col justify-center px-5 py-4">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-700">
            <Sparkles className="size-3.5" aria-hidden />
            Setup in progress
          </p>
          <p className="mt-1 text-[15px] font-extrabold text-ink-900">Continue on Getting started</p>
          <p className="mt-0.5 text-[13px] font-medium text-ink-500">
            {progress
              ? `${progress.completed} of ${progress.total} steps done — pick up where you left off.`
              : 'Finish workspace setup on the Getting started page.'}
          </p>
          {progress && progress.total > 0 ? (
            <div className="mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-brand-100">
              <div
                className="h-full rounded-full bg-brand-500 transition-[width] duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          ) : null}
        </div>
        <div className="flex items-center border-t border-brand-100/80 px-5 py-4 sm:border-t-0 sm:border-l">
          <Button asChild className="w-full shrink-0 sm:w-auto">
            <Link href="/getting-started">
              Continue setup
              <ArrowRight className="size-4" strokeWidth={2.2} aria-hidden />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
