'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { mergeContactsAction } from '@/server/actions/contacts/contact-lifecycle';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function MergeContactsDialog({
  open,
  onOpenChange,
  primaryContactId,
  primaryVersion,
  primaryDisplayName,
  duplicates,
  onMerged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryContactId: string;
  primaryVersion: number;
  primaryDisplayName: string;
  duplicates: {
    id: string;
    displayName: string;
    email: string | null;
    matchedOn: string;
  }[];
  onMerged: (survivingId: string) => void;
}) {
  const [secondaryId, setSecondaryId] = useState(duplicates[0]?.id ?? '');
  const [pending, startTransition] = useTransition();

  const merge = () => {
    if (!secondaryId) return;
    startTransition(async () => {
      const result = await mergeContactsAction({
        primaryContactId,
        secondaryContactId: secondaryId,
        primaryVersion,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Contacts merged');
      onOpenChange(false);
      onMerged(primaryContactId);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Merge duplicates</DialogTitle>
        </DialogHeader>
        <p className="text-[13px] text-ink-600">
          Keep <b>{primaryDisplayName}</b> and merge the selected record into it. Deals, tags, and
          consent follow the merge rules (any DND on either record is kept).
        </p>
        <ul className="max-h-48 space-y-2 overflow-y-auto">
          {duplicates.map((row) => (
            <li key={row.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-line px-3 py-2">
                <input
                  type="radio"
                  name="merge-secondary"
                  checked={secondaryId === row.id}
                  onChange={() => setSecondaryId(row.id)}
                />
                <span className="text-[13px]">
                  <b className="block text-ink-900">{row.displayName}</b>
                  <span className="text-ink-500">
                    {row.email ?? 'No email'} · matched on {row.matchedOn}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || !secondaryId} onClick={merge}>
            Merge into {primaryDisplayName.split(' ')[0]}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
