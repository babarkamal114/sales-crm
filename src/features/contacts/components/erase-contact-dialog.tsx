'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { eraseContactAction } from '@/server/actions/contacts/contact-lifecycle';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function EraseContactDialog({
  open,
  onOpenChange,
  contactId,
  displayName,
  onErased,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  displayName: string;
  onErased: () => void;
}) {
  const [confirm, setConfirm] = useState('');
  const [pending, startTransition] = useTransition();

  const erase = () => {
    startTransition(async () => {
      const result = await eraseContactAction({
        contactId,
        confirmDisplayName: confirm.trim(),
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Contact erased');
      onOpenChange(false);
      onErased();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Erase contact (permanent)</DialogTitle>
        </DialogHeader>
        <p className="text-[13px] leading-relaxed text-ink-600">
          This removes personal data across CRM tables, adds a suppression entry, and cannot be undone.
          Type the contact&apos;s display name to confirm.
        </p>
        <p className="rounded-lg bg-soft px-3 py-2 text-[13px] font-bold text-ink-900">{displayName}</p>
        <Input
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Type name to confirm"
          autoComplete="off"
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-rose-700 hover:bg-rose-800"
            disabled={pending || confirm.trim() !== displayName.trim()}
            onClick={erase}
          >
            Erase permanently
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
