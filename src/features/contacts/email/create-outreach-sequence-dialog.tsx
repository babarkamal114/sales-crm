'use client';

import { useEffect, useId, useState } from 'react';
import type { OrgOutreachSequenceView } from '@/domain/contacts/outreach-sequence-view';
import { createOrgOutreachSequenceAction } from '@/server/actions/contacts/org-outreach-sequence';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';

export function CreateOutreachSequenceDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (sequence: OrgOutreachSequenceView) => void;
}) {
  const labelId = useId();
  const [label, setLabel] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) setLabel('');
  }, [open]);

  const submit = async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      toast.error('Enter a sequence name');
      return;
    }
    setPending(true);
    try {
      const result = await createOrgOutreachSequenceAction({ label: trimmed });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Sequence created');
      onCreated(result.data.sequence);
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onOpenChange(false);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New outreach sequence</DialogTitle>
          <DialogDescription>
            We&apos;ll add step 1 and a matching email template. You can add more steps and edit
            timing after creating the sequence.
          </DialogDescription>
        </DialogHeader>

        <label className="block space-y-1.5" htmlFor={labelId}>
          <span className="text-[12px] font-semibold text-ink-500">Sequence name</span>
          <input
            id={labelId}
            className="h-10 w-full rounded-xl border border-line px-3 text-[13px] font-medium text-ink-900"
            placeholder="e.g. Partner intro, Event follow-up"
            value={label}
            maxLength={120}
            autoFocus
            onChange={(event) => setLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void submit();
              }
            }}
          />
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={() => void submit()}>
            {pending ? 'Creating…' : 'Create sequence'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
