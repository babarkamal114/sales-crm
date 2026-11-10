'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { OpportunityCardView } from '@/domain/opportunities/card-view';
import { formatOpportunityValue } from '@/features/opportunities/lib/format-money';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

async function fetchLostReasons() {
  const response = await fetch('/api/v1/lost-reasons');
  if (!response.ok) throw new Error('Failed to load reasons');
  return response.json() as Promise<{ reasons: { id: string; name: string }[] }>;
}

export function MarkLostDialog({
  open,
  card,
  onOpenChange,
  onConfirm,
  confirming,
}: {
  open: boolean;
  card: OpportunityCardView | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { lostReasonId: string; lostNote?: string }) => void;
  confirming?: boolean;
}) {
  const [reasonId, setReasonId] = useState('');
  const [note, setNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['lost-reasons'],
    queryFn: fetchLostReasons,
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setReasonId('');
      setNote('');
    }
  }, [open]);

  const valueLabel =
    card?.valuePence != null
      ? formatOpportunityValue(card.valuePence, card.currency)
      : 'No value set';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Mark as lost</DialogTitle>
          <DialogDescription>
            {card ? (
              <>
                <span className="font-bold text-ink-900">{card.name}</span>
                {' · '}
                {valueLabel}. Tell the team why this deal was lost.
              </>
            ) : (
              'Tell the team why this deal was lost.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lost-reason">Reason (required)</Label>
            <select
              id="lost-reason"
              className="h-10 w-full rounded-xl border border-line bg-white px-3 text-[13px] font-medium text-ink-900"
              value={reasonId}
              disabled={isLoading || confirming}
              onChange={(event) => setReasonId(event.target.value)}
            >
              <option value="">Choose a reason</option>
              {(data?.reasons ?? []).map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lost-note">Note (optional)</Label>
            <textarea
              id="lost-note"
              rows={3}
              placeholder="Anything worth knowing next time"
              className="w-full resize-none rounded-xl border border-line bg-white px-3 py-2 text-[13px] font-medium text-ink-900"
              value={note}
              disabled={confirming}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={confirming}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!reasonId || confirming}
            onClick={() =>
              onConfirm({
                lostReasonId: reasonId,
                ...(note.trim() ? { lostNote: note.trim() } : {}),
              })
            }
          >
            Mark as lost
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
