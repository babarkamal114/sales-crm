'use client';

import { useState } from 'react';
import type { SavedViewFilters } from '@/domain/opportunities/saved-view';
import { createSavedViewAction } from '@/server/actions/opportunities/saved-views';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

export function SaveViewDialog({
  open,
  onOpenChange,
  pipelineId,
  scope,
  filters,
  canShareWithTeam,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  scope: 'board' | 'list';
  filters: SavedViewFilters;
  canShareWithTeam: boolean;
  onSaved: (id: string, name: string, shared: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [shared, setShared] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Name this view');
      return;
    }
    setPending(true);
    try {
      const result = await createSavedViewAction({
        name: trimmed,
        scope,
        pipelineId,
        filters,
        shared: canShareWithTeam && shared,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(shared && canShareWithTeam ? 'Team view saved' : 'View saved');
      setName('');
      setShared(false);
      onOpenChange(false);
      onSaved(result.data.id, trimmed, canShareWithTeam && shared);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save view</DialogTitle>
          <DialogDescription>
            {canShareWithTeam
              ? 'Save filters for yourself or share a team view everyone on this pipeline can use.'
              : 'Save the current filters and sort for this pipeline. Only you can remove your personal views.'}
          </DialogDescription>
        </DialogHeader>
        <label className="block space-y-2">
          <span className="text-[12px] font-semibold text-ink-500">Name</span>
          <input
            className="h-10 w-full rounded-xl border border-line bg-white px-3 text-[13px] font-medium text-ink-900"
            value={name}
            maxLength={80}
            placeholder="e.g. My open deals"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {canShareWithTeam ? (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-soft/40 px-3 py-2.5">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-line"
              checked={shared}
              onChange={(event) => setShared(event.target.checked)}
            />
            <span className="text-[12px] leading-snug text-ink-600">
              <span className="font-semibold text-ink-800">Share with team</span>
              <span className="block text-ink-500">
                Admins and managers can remove team views; members can apply them but not delete them.
              </span>
            </span>
          </label>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={() => void submit()}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
