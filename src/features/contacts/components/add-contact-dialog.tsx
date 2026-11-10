'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AddContactForm } from '@/features/contacts/components/add-contact-form';

export function AddContactDialog({
  open,
  onOpenChange,
  role,
  userId,
  onCreated,
  defaultCompanyId = null,
  defaultCompanyName = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: string;
  userId: string;
  onCreated: (contactId: string) => void;
  defaultCompanyId?: string | null;
  defaultCompanyName?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
          <DialogDescription>
            UK consent and duplicate checks are applied before save. Email or phone is required.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <AddContactForm
            role={role}
            userId={userId}
            defaultCompanyId={defaultCompanyId}
            defaultCompanyName={defaultCompanyName}
            onCreated={(id) => {
              onOpenChange(false);
              onCreated(id);
            }}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
