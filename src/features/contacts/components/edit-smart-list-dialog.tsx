'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateSmartListAction } from '@/server/actions/contacts/smart-lists';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export type EditSmartListTarget = {
  id: string;
  name: string;
  isShared: boolean;
  filters: Record<string, unknown>;
  sort: Record<string, unknown>;
  columns: unknown[];
};

export function EditSmartListDialog({
  open,
  onOpenChange,
  target,
  canShare,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: EditSmartListTarget | null;
  canShare: boolean;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [shared, setShared] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!target) return;
    setName(target.name);
    setShared(target.isShared);
  }, [target]);

  const save = () => {
    if (!target) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Enter a name for this view.');
      return;
    }
    startTransition(async () => {
      const result = await updateSmartListAction({
        smartListId: target.id,
        name: trimmed,
        shared: canShare ? shared : false,
        filters: target.filters,
        sort: target.sort,
        columns: target.columns,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Smart list updated');
      onOpenChange(false);
      onSaved();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit smart list</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="List name"
            autoFocus
          />
          {canShare ? (
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink-700">
              <input
                type="checkbox"
                checked={shared}
                onChange={(event) => setShared(event.target.checked)}
              />
              Share with team
            </label>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || !target} onClick={save}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
