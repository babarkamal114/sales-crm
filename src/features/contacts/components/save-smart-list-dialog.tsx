'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { ContactListQuery } from '@/domain/contacts/list-query';
import { saveSmartListAction } from '@/server/actions/contacts/smart-lists';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export function SaveSmartListDialog({
  open,
  onOpenChange,
  query,
  canShare,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: ContactListQuery;
  canShare: boolean;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [shared, setShared] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Enter a name for this view.');
      return;
    }
    startTransition(async () => {
      const result = await saveSmartListAction({
        name: trimmed,
        shared: canShare && shared,
        filters: {
          list: query.list,
          owner: query.owner,
          q: query.q ?? '',
          lifecycle: query.lifecycle,
          tagId: query.tagId,
          source: query.source,
        },
        sort: { field: query.sort, dir: query.dir },
        columns: [],
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Smart list saved');
      setName('');
      onOpenChange(false);
      onSaved();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save smart list</DialogTitle>
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
          <Button type="button" disabled={pending} onClick={save}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
