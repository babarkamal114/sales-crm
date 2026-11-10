'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { linkContactToCompanyAction } from '@/server/actions/companies/link-contact';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type PickerRow = {
  id: string;
  displayName: string;
  email: string | null;
  version: number;
};

async function searchContacts(q: string): Promise<PickerRow[]> {
  if (!q.trim()) return [];
  const response = await fetch(`/api/v1/contacts/search?q=${encodeURIComponent(q.trim())}`);
  if (!response.ok) return [];
  const data = (await response.json()) as { items: PickerRow[] };
  return data.items;
}

export function LinkContactDialog({
  open,
  onOpenChange,
  companyId,
  onLinked,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onLinked: () => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PickerRow[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void searchContacts(q).then(setResults);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [q, open]);

  const link = (row: PickerRow) => {
    startTransition(async () => {
      const result = await linkContactToCompanyAction({
        contactId: row.id,
        version: row.version,
        companyId,
        isPrimary: false,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`${row.displayName} linked`);
      onOpenChange(false);
      onLinked();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link existing contact</DialogTitle>
        </DialogHeader>
        <input
          className="h-10 w-full rounded-lg border border-line px-3 text-[13px]"
          placeholder="Search contacts…"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {results.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                disabled={pending}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-soft"
                onClick={() => link(row)}
              >
                <span className="text-[13px] font-semibold">{row.displayName}</span>
                <span className="text-[12px] text-ink-500">{row.email ?? 'No email'}</span>
              </button>
            </li>
          ))}
        </ul>
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}
