'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';

export function OnboardingHeader({
  organisationName,
  onSaveAndExit,
  savingExit = false,
  headerActions,
}: {
  organisationName: string;
  onSaveAndExit: () => void;
  savingExit?: boolean;
  headerActions?: ReactNode;
}) {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-line/60 bg-white/70 px-5 py-4 backdrop-blur-sm sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Image
          src="/logo/sponsoro-logo.svg"
          alt="CRM"
          width={108}
          height={28}
          className="h-8 w-auto"
          priority
        />
        <div className="hidden h-5 w-px bg-line sm:block" aria-hidden />
        <p className="hidden truncate text-[12.5px] font-semibold text-ink-500 sm:block">
          Setting up · {organisationName}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {headerActions}
        <button
          type="button"
          disabled={savingExit}
          onClick={onSaveAndExit}
          className="rounded-xl px-3 py-2 text-[12.5px] font-bold text-ink-400 transition-colors hover:bg-soft hover:text-ink-700 disabled:opacity-50"
        >
          {savingExit ? 'Saving…' : 'Save & exit'}
        </button>
      </div>
    </header>
  );
}

export function OnboardingShell({
  organisationName,
  headerActions,
  children,
}: {
  organisationName: string;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const [savingExit, startTransition] = useTransition();

  function handleSaveAndExit() {
    startTransition(() => {
      router.push('/');
      router.refresh();
    });
  }

  return (
    <div className="onboarding-shell flex h-dvh min-h-dvh flex-col overflow-hidden">
      <OnboardingHeader
        organisationName={organisationName}
        onSaveAndExit={handleSaveAndExit}
        savingExit={savingExit}
        headerActions={headerActions}
      />
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto scroll-thin">
        <div className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-6 sm:px-8 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export function OnboardingCard({ children }: { children: ReactNode }) {
  return <Card className="overflow-hidden shadow-panel">{children}</Card>;
}

export function OnboardingFooterNote() {
  return (
    <p className="text-center text-[11px] font-medium text-ink-400">
      Encrypted · UK-hosted ·{' '}
      <a href="mailto:support@sponsoro.co.uk" className="text-brand-600 hover:underline">
        Need help?
      </a>
    </p>
  );
}
