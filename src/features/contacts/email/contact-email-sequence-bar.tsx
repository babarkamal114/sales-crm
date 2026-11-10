'use client';

import Link from 'next/link';
import { OutreachStepTemplatePreview } from '@/features/contacts/email/outreach-step-template-preview';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ContactEmailSequenceView } from '@/domain/contacts/email-sequence-view';
import {
  pauseContactEmailSequenceAction,
  scheduleContactEmailSequenceAction,
  skipContactEmailSequenceStepAction,
  switchContactEmailSequenceAction,
} from '@/server/actions/contacts/contact-email-sequence';
import { formatDateTime } from '@/features/opportunities/lib/format-duration';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

async function fetchSequence(contactId: string) {
  const response = await fetch(`/api/v1/contacts/${contactId}/email-sequence`);
  if (!response.ok) throw new Error('Failed');
  const data = (await response.json()) as { sequence: ContactEmailSequenceView };
  return data.sequence;
}

export function ContactEmailSequenceBar({
  contactId,
  onCheckReplies,
  onSequenceChange,
}: {
  contactId: string;
  onCheckReplies?: () => void;
  onSequenceChange?: () => void;
}) {
  const [scheduleValue, setScheduleValue] = useState('');
  const [switching, setSwitching] = useState(false);
  const { data: sequence, refetch, isLoading } = useQuery({
    queryKey: ['contact-email-sequence', contactId],
    queryFn: () => fetchSequence(contactId),
  });

  if (isLoading || !sequence) {
    return null;
  }

  const current = sequence.steps.find((s) => s.status === 'current');

  const runSkip = async () => {
    const result = await skipContactEmailSequenceStepAction({ contactId });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.message('Skipped to next step');
    void refetch();
  };

  const runSchedule = async () => {
    if (!scheduleValue) {
      toast.error('Pick a start date and time');
      return;
    }
    const iso = new Date(scheduleValue).toISOString();
    const result = await scheduleContactEmailSequenceAction({
      contactId,
      scheduledStartAt: iso,
    });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.message('Sequence scheduled');
    void refetch();
  };

  const runSwitchSequence = async (sequenceKey: string) => {
    if (sequenceKey === sequence.sequenceKey) return;
    setSwitching(true);
    try {
      const result = await switchContactEmailSequenceAction({ contactId, sequenceKey });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.message('Sequence updated — step 1 is ready to send');
      onSequenceChange?.();
      void refetch();
    } finally {
      setSwitching(false);
    }
  };

  const runPause = async () => {
    const result = await pauseContactEmailSequenceAction({ contactId });
    if (!result.ok) {
      toast.error(result.error.message);
      return;
    }
    toast.message('Sequence paused');
    void refetch();
  };

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3',
        sequence.isOverdue
          ? 'border-amber-200 bg-amber-50'
          : 'border-line/80 bg-white shadow-panel',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-[200px] flex-1">
          <label className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
            Outreach sequence
          </label>
          <select
            className="mt-1 block w-full max-w-sm rounded-lg border border-line bg-white px-3 py-2 text-[13px] font-bold text-ink-900"
            value={sequence.sequenceKey}
            disabled={switching}
            onChange={(e) => void runSwitchSequence(e.target.value)}
          >
            {sequence.availableSequences.map((option) => (
              <option key={option.sequenceKey} value={option.sequenceKey}>
                {option.label}
                {option.isLifecycleDefault ? ' (default)' : ''}
              </option>
            ))}
          </select>
          <p className="text-[12px] font-medium text-ink-500">
            {sequence.status === 'completed'
              ? 'Sequence complete'
              : sequence.status === 'replied'
                ? 'Paused — contact replied (review AI draft below)'
                : sequence.status === 'paused'
                  ? 'Paused'
                  : sequence.scheduledStartAt &&
                      new Date(sequence.scheduledStartAt).getTime() > Date.now()
                    ? `Starts ${formatDateTime(sequence.scheduledStartAt)}`
                    : sequence.isOverdue
                      ? 'Reminder overdue'
                      : sequence.nextDueAt
                        ? `Next due ${formatDateTime(sequence.nextDueAt)}`
                        : 'Ready to send'}
          </p>
          <Link
            href="/settings/outreach-sequences"
            className="mt-1 inline-block text-[11px] font-bold text-brand-700 hover:text-brand-800"
          >
            Customise sequence{sequence.isCustomised ? ' (org customised)' : ''} →
          </Link>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {onCheckReplies ? (
            <Button type="button" variant="ghost" size="sm" onClick={onCheckReplies}>
              Check for replies
            </Button>
          ) : null}
          {sequence.status === 'active' && current ? (
            <>
              <Button type="button" variant="ghost" size="sm" onClick={() => void runSkip()}>
                Skip step
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => void runPause()}>
                Pause
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {sequence.status === 'active' ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-line/60 pt-3">
          <label className="text-[11px] font-bold text-ink-500">
            Schedule sequence start
            <input
              type="datetime-local"
              className="mt-1 block rounded-lg border border-line px-2 py-1.5 text-[12px] font-medium"
              value={scheduleValue}
              onChange={(e) => setScheduleValue(e.target.value)}
            />
          </label>
          <Button type="button" variant="ghost" size="sm" onClick={() => void runSchedule()}>
            Apply schedule
          </Button>
        </div>
      ) : null}

      <ol className="mt-3 space-y-2">
        {sequence.steps.map((step) => (
          <li
            key={step.stepKey}
            className={cn(
              'rounded-xl border px-3 py-2.5',
              step.status === 'done' && 'border-mint-200 bg-mint-50/50',
              step.status === 'current' && 'border-brand-200 bg-brand-50/40',
              step.status === 'upcoming' && 'border-line/60 bg-soft/30',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p
                className={cn(
                  'text-[12px] font-bold',
                  step.status === 'current' ? 'text-brand-900' : 'text-ink-900',
                )}
              >
                {step.index + 1}. {step.label}
                {step.status === 'current' ? (
                  <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                    Current
                  </span>
                ) : null}
              </p>
              {step.template ? (
                <Link
                  href={`/settings/email-templates?template=${step.template.id}`}
                  className="text-[11px] font-bold text-brand-700 hover:text-brand-800"
                >
                  Edit template
                </Link>
              ) : null}
            </div>
            {step.template ? (
              <>
                <p className="mt-1 text-[12px] font-semibold text-ink-700">{step.template.subject}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-ink-500">
                  {step.template.bodyPreview}
                </p>
              </>
            ) : (
              <OutreachStepTemplatePreview
                stepKey={step.stepKey}
                stepLabel={step.label}
                template={null}
                compact
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
