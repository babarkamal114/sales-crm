'use client';

import { useState } from 'react';
import type { ContactEmailReplyDraftView } from '@/domain/contacts/outreach-sequence-view';
import {
  dismissContactEmailReplyDraftAction,
} from '@/server/actions/contacts/contact-email-reply';
import { sendContactEmailAction } from '@/server/actions/contacts/contact-email';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

export function ContactEmailReplyPanel({
  contactId,
  draft,
  onUpdated,
}: {
  contactId: string;
  draft: ContactEmailReplyDraftView;
  onUpdated: () => void;
}) {
  const [subject, setSubject] = useState(draft.draftSubject);
  const [bodyHtml, setBodyHtml] = useState(draft.draftHtml);
  const [pending, setPending] = useState(false);

  const dismiss = async () => {
    setPending(true);
    try {
      const result = await dismissContactEmailReplyDraftAction({
        contactId,
        draftId: draft.id,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.message('Draft dismissed');
      onUpdated();
    } finally {
      setPending(false);
    }
  };

  const send = async () => {
    setPending(true);
    try {
      const result = await sendContactEmailAction({
        contactIds: [contactId],
        subject: subject.trim(),
        bodyHtml: bodyHtml.trim(),
        advanceSequence: false,
        scheduleNextReminder: false,
        replyDraftId: draft.id,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      if (result.data.sent === 0) {
        toast.error('Email was not sent — check consent and Google Mail connection.');
        return;
      }
      toast.success('Reply sent');
      onUpdated();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-4 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[14px] font-extrabold text-ink-900">Reply received — AI draft ready</p>
          <p className="mt-1 text-[12px] font-medium text-ink-600">
            From: {draft.inboundFrom ?? 'Contact'} · {draft.inboundPreview.slice(0, 160)}
            {draft.inboundPreview.length > 160 ? '…' : ''}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => void dismiss()}>
            Dismiss
          </Button>
          <Button type="button" size="sm" disabled={pending} onClick={() => void send()}>
            Send reply
          </Button>
        </div>
      </div>

      <label className="mt-4 block text-[12px] font-bold text-ink-500">
        Subject
        <input
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] font-semibold text-ink-900"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </label>
      <label className="mt-3 block text-[12px] font-bold text-ink-500">
        Message (HTML)
        <textarea
          className="mt-1 min-h-[140px] w-full rounded-lg border border-line bg-white px-3 py-2 font-mono text-[12px] leading-relaxed text-ink-800"
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
        />
      </label>
    </div>
  );
}
