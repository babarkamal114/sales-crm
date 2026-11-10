'use client';

import { useState } from 'react';
import type { OpportunityDetailView } from '@/domain/opportunities/detail-view';
import { formatDateTime } from '@/features/opportunities/lib/format-duration';
import { createOpportunityNoteAction } from '@/server/actions/opportunities/collaboration';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

export function DealSheetNotes({
  deal,
  currentUserId,
  onChanged,
}: {
  deal: OpportunityDetailView;
  currentUserId: string;
  onChanged: () => void;
}) {
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error('Write a note');
      return;
    }
    setPending(true);
    try {
      const result = await createOpportunityNoteAction({
        opportunityId: deal.id,
        body: trimmed,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      setBody('');
      toast.success('Note added');
      onChanged();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line/70 bg-white p-3 shadow-sm">
        <label className="block space-y-2">
          <span className="text-[12px] font-semibold text-ink-500">Add a note for the team</span>
          <textarea
            className="min-h-[88px] w-full resize-y rounded-xl border border-line bg-soft/30 px-3 py-2.5 text-[13px] font-medium text-ink-900 placeholder:text-ink-400"
            placeholder="Context, next steps, objections…"
            value={body}
            maxLength={10_000}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <div className="mt-2 flex justify-end">
          <Button type="button" size="sm" disabled={pending} onClick={() => void submit()}>
            {pending ? 'Posting…' : 'Post note'}
          </Button>
        </div>
      </div>

      {deal.notes.length === 0 ? (
        <p className="rounded-2xl border border-line/70 bg-soft/40 px-4 py-8 text-center text-[13px] font-medium text-ink-500">
          No notes yet. Anyone on this pipeline can leave the first one.
        </p>
      ) : (
        <ul className="space-y-3">
          {deal.notes.map((note) => {
            const isMine = note.author.id === currentUserId;
            return (
              <li
                key={note.id}
                className={cn(
                  'rounded-2xl border border-line/70 bg-white px-4 py-3 shadow-sm',
                  isMine && 'ring-1 ring-brand-100',
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: isMine ? 'var(--brand-600, #2563eb)' : 'var(--ink-700, #374151)' }}
                    aria-hidden
                  >
                    {note.author.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-ink-800">
                      {note.author.fullName}
                      {isMine ? (
                        <span className="ml-1.5 font-medium text-ink-400">(you)</span>
                      ) : null}
                      <span className="ml-2 font-medium text-ink-400">
                        {formatDateTime(note.createdAt)}
                      </span>
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-ink-800">
                      {note.body}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
