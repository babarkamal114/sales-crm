'use client';

import type { ReactNode } from 'react';
import type { OpportunityDetailView } from '@/domain/opportunities/detail-view';
import {
  formatDateTime,
  formatDurationSeconds,
} from '@/features/opportunities/lib/format-duration';
import { ArrowRight } from 'lucide-react';

type TimelineItem =
  | { kind: 'stage'; id: string; at: string; node: ReactNode }
  | { kind: 'note'; id: string; at: string; node: ReactNode };

export function DealSheetActivity({ deal }: { deal: OpportunityDetailView }) {
  const items: TimelineItem[] = [
    ...deal.activity.map((item) => ({
      kind: 'stage' as const,
      id: item.id,
      at: item.movedAt,
      node: (
        <>
          <p className="text-[12px] font-semibold text-ink-500">{formatDateTime(item.movedAt)}</p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] font-bold text-ink-900">
            {item.fromStageName ? (
              <>
                <span>{item.fromStageName}</span>
                <ArrowRight className="size-3.5 text-ink-400" aria-hidden />
              </>
            ) : null}
            <span>{item.toStageName}</span>
          </p>
          <p className="mt-1 text-[12px] font-medium text-ink-500">
            {item.movedByName}
            {item.timeInPreviousStageSeconds != null ? (
              <>
                {' · '}
                {formatDurationSeconds(item.timeInPreviousStageSeconds)} in previous stage
              </>
            ) : null}
          </p>
        </>
      ),
    })),
    ...deal.notes.map((note) => ({
      kind: 'note' as const,
      id: note.id,
      at: note.createdAt,
      node: (
        <>
          <p className="text-[12px] font-semibold text-ink-500">
            {formatDateTime(note.createdAt)} · Note
          </p>
          <p className="mt-1 text-[12px] font-medium text-ink-500">{note.author.fullName}</p>
          <p className="mt-1 whitespace-pre-wrap text-[13px] font-medium text-ink-800">{note.body}</p>
        </>
      ),
    })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-line/70 bg-soft/40 px-4 py-8 text-center text-[13px] font-medium text-ink-500">
        No activity yet. Stage moves and team notes will show up here.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {items.map((item) => (
        <li
          key={`${item.kind}-${item.id}`}
          className="rounded-2xl border border-line/70 bg-white px-4 py-3 shadow-sm"
        >
          {item.node}
        </li>
      ))}
    </ol>
  );
}
