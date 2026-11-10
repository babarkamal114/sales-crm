'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LeadCsvImportPanel } from '@/features/getting-started/components/lead-csv-import-panel';
import { ContentPanel } from '@/components/layouts/app-header';

export function ContactsImportPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <ContentPanel className="mx-auto max-w-3xl space-y-5 pb-28">
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft className="size-4" />
        Back to contacts
      </Link>
      <header>
        <h1 className="text-[22px] font-extrabold text-ink-900">Import contacts</h1>
        <p className="mt-1 text-[13px] font-medium text-ink-500">
          Upload a CSV to create contacts and optional starter deals (same pipeline as onboarding).
          Column mapping, consent columns, and undo import are planned for a later job-based import.
        </p>
      </header>
      <LeadCsvImportPanel
        error={error}
        setError={setError}
        onComplete={() => {
          router.push('/contacts');
          router.refresh();
        }}
      />
    </ContentPanel>
  );
}
