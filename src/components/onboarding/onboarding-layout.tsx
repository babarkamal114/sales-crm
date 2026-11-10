'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export function OnboardingContentCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-line/50 bg-white shadow-panel">
      <div className="border-b border-line/50 bg-white px-6 py-5 sm:px-8">
        <h2 className="text-[20px] font-extrabold tracking-tight text-ink-900 sm:text-[21px]">
          {title}
        </h2>
        <p className="mt-1.5 text-[13.5px] font-medium leading-relaxed text-ink-500">
          {description}
        </p>
      </div>
      <div className={cn(!footer && 'px-6 py-6 sm:px-8 sm:py-7')}>
        {footer ? (
          <>
            <div className="px-6 py-6 sm:px-8 sm:py-7">{children}</div>
            {footer}
          </>
        ) : (
          children
        )}
      </div>
    </Card>
  );
}

export function OnboardingInfoPanel({
  title,
  children,
  tone = 'brand',
}: {
  title: string;
  children: ReactNode;
  tone?: 'brand' | 'mint' | 'soft';
}) {
  const toneClass =
    tone === 'mint'
      ? 'border-mint-100 bg-mint-50/60'
      : tone === 'soft'
        ? 'border-line/80 bg-soft/50'
        : 'border-brand-100 bg-brand-50/50';

  return (
    <div className={cn('rounded-xl2 border p-4', toneClass)}>
      <p className="mb-2 text-[12px] font-extrabold text-ink-800">{title}</p>
      <div className="text-[12.5px] font-medium leading-relaxed text-ink-600">
        {children}
      </div>
    </div>
  );
}

export function OnboardingFormSection({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      {title ? (
        <div>
          <h3 className="text-[14px] font-bold text-ink-900">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-[12.5px] font-medium text-ink-500">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
