'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { MergeContactsDialog } from '@/features/contacts/components/merge-contacts-dialog';
import { Button } from '@/components/ui/button';

type DuplicateItem = {
  id: string;
  displayName: string;
  email: string | null;
  phoneE164: string | null;
  matchedOn: 'email' | 'phone' | 'name';
};

async function fetchDuplicates(contactId: string) {
  const response = await fetch(`/api/v1/contacts/${contactId}/duplicates`);
  if (!response.ok) return [];
  const data = (await response.json()) as { items: DuplicateItem[] };
  return data.items;
}

export function ContactDuplicatesBanner({
  contactId,
  contactVersion,
  displayName,
  canMerge,
  onMerged,
}: {
  contactId: string;
  contactVersion: number;
  displayName: string;
  canMerge: boolean;
  onMerged: (survivingId: string) => void;
}) {
  const [mergeOpen, setMergeOpen] = useState(false);
  const { data: duplicates = [] } = useQuery({
    queryKey: ['contact-duplicates', contactId],
    queryFn: () => fetchDuplicates(contactId),
  });

  if (duplicates.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-xl2 border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-900">
        <AlertTriangle className="size-4 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1">
          <b className="font-bold">{duplicates.length} possible duplicate(s)</b> — matched on email,
          phone, or name + company.
        </p>
        {canMerge ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => setMergeOpen(true)}>
            Review merge
          </Button>
        ) : null}
      </div>
      <MergeContactsDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        primaryContactId={contactId}
        primaryVersion={contactVersion}
        primaryDisplayName={displayName}
        duplicates={duplicates}
        onMerged={onMerged}
      />
    </>
  );
}
