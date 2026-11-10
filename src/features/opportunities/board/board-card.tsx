'use client';

import { memo, type HTMLAttributes } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock,
  MessageSquare,
  Phone,
  StickyNote,
  ListTodo,
} from 'lucide-react';
import type { OpportunityCardView, PipelineStageView } from '@/domain/opportunities/card-view';
import { formatExactValueTooltip, formatOpportunityValue } from '@/features/opportunities/lib/format-money';
import { BoardCardMenu } from '@/features/opportunities/board/board-card-menu';
import { EntityLink } from '@/components/entities/entity-link';
import { openConversationForContact } from '@/features/conversations/lib/open-conversation-for-contact';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const BoardCard = memo(function BoardCard({
  card,
  onOpen,
  stages,
  currentStageId,
  onMoveToStage,
  isDragging,
  dragOverlay,
  dragHandleProps,
  onKeyboardMove,
}: {
  card: OpportunityCardView;
  onOpen: (id: string) => void;
  stages?: PipelineStageView[];
  currentStageId?: string;
  onMoveToStage?: (stageId: string) => void;
  isDragging?: boolean;
  dragOverlay?: boolean;
  dragHandleProps?: HTMLAttributes<HTMLElement>;
  onKeyboardMove?: (direction: 'left' | 'right') => void;
}) {
  const router = useRouter();

  return (
    <article
      data-board-card-id={card.id}
      data-board-stage-id={currentStageId}
      className={cn(
        'group relative rounded-[18px] border border-line bg-white p-3 shadow-[0_1px_2px_rgba(25,29,40,0.06)] transition-[box-shadow,transform,border-color] hover:border-[#E1E4EE] hover:shadow-[0_2px_4px_rgba(25,29,40,0.06),0_10px_24px_-10px_rgba(68,80,196,0.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        dragHandleProps ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        isDragging && 'opacity-45',
        dragOverlay && 'pointer-events-none shadow-panel',
      )}
      tabIndex={dragOverlay ? -1 : 0}
      role="button"
      {...(dragHandleProps ?? {})}
      onClick={() => {
        if (!dragOverlay) onOpen(card.id);
      }}
      onKeyDown={(event) => {
        if (dragOverlay) return;
        if (event.key === 'Enter') {
          event.preventDefault();
          onOpen(card.id);
          return;
        }
        if (
          onKeyboardMove &&
          event.shiftKey &&
          (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
        ) {
          event.preventDefault();
          onKeyboardMove(event.key === 'ArrowRight' ? 'right' : 'left');
        }
      }}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-ink-900" title={card.name}>
            {card.name}
          </p>
          <p className="mt-0.5 truncate text-[12px] font-medium text-ink-500">
            <EntityLink
              entity={{ type: 'contact', id: card.contactId }}
              className="text-[12px] font-medium"
            >
              {card.contactName}
            </EntityLink>
            {card.companyId && card.companyName ? (
              <>
                {' · '}
                <EntityLink
                  entity={{ type: 'company', id: card.companyId }}
                  className="text-[12px] font-medium"
                >
                  {card.companyName}
                </EntityLink>
              </>
            ) : null}
          </p>
        </div>
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: card.owner.colour }}
          title="Owner"
        >
          {card.owner.initials}
        </span>
        {stages && currentStageId && onMoveToStage ? (
          <BoardCardMenu
            dealName={card.name}
            currentStageId={currentStageId}
            stages={stages}
            onMoveToStage={onMoveToStage}
          />
        ) : null}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span
          className="text-[13px] font-bold text-ink-900 num"
          title={formatExactValueTooltip(card.valuePence, card.currency)}
        >
          {formatOpportunityValue(card.valuePence, card.currency)}
        </span>
        {card.source ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-soft px-2 py-0.5 text-[10px] font-bold text-ink-600">
            <i className="size-1.5 rounded-full bg-brand-500" aria-hidden />
            {card.source}
          </span>
        ) : null}
        {card.status === 'won' && card.wonAt ? (
          <span className="rounded-full bg-mint-50 px-2 py-0.5 text-[10px] font-bold text-mint-700">
            Won
          </span>
        ) : null}
        {card.status === 'lost' && card.lostReasonName ? (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
            {card.lostReasonName}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-semibold text-ink-500">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={card.contactDndCall}
            title={card.contactDndCall ? 'Contact has do not call enabled' : 'Call'}
            className="grid size-7 place-items-center rounded-lg hover:bg-soft hover:text-brand-700 disabled:opacity-40"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Phone className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            disabled={card.contactDndMessage}
            title={card.contactDndMessage ? 'Contact has do not message enabled' : 'Message'}
            className="relative grid size-7 place-items-center rounded-lg hover:bg-soft hover:text-brand-700 disabled:opacity-40"
            onClick={(event) => {
              event.stopPropagation();
              if (card.contactDndMessage) return;
              void openConversationForContact(router, card.contactId).then((ok) => {
                if (!ok) toast.error('Could not open conversation.');
              });
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <MessageSquare className="size-3.5" aria-hidden />
            {card.unreadMessages ? (
              <span className="absolute ml-3 mt-[-10px] size-1.5 rounded-full bg-brand-600" />
            ) : null}
          </button>
          <span className="inline-flex items-center gap-0.5 px-0.5">
            <ListTodo className="size-3.5" aria-hidden />
            {card.openTaskCount}
          </span>
          <span className="inline-flex items-center gap-0.5 px-0.5">
            <StickyNote className="size-3.5" aria-hidden />
            {card.noteCount}
          </span>
        </div>
        {card.status === 'open' ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 num',
              card.isRotting ? 'text-amber-700' : 'text-ink-400',
            )}
          >
            <Clock className="size-3.5" aria-hidden />
            {card.isRotting ? `No next step · ${card.daysInStage}d` : `${card.daysInStage}d`}
          </span>
        ) : null}
      </div>
    </article>
  );
});
