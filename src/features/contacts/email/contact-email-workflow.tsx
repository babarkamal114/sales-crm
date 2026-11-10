'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Loader2, Mail, Send } from 'lucide-react';
import {
  buildEmailMergeContext,
  mergeEmailTemplate,
} from '@/domain/contacts/email-merge';
import {
  defaultStepKeyForLifecycle,
  EMAIL_MERGE_TOKEN_HELP,
  normaliseCustomStepKey,
  stepLabelForKey,
} from '@/domain/contacts/email-template-steps';
import type { ContactEmailSendView, ContactEmailTemplateView } from '@/domain/contacts/email-template-view';
import type { ContactEmailSequenceView } from '@/domain/contacts/email-sequence-view';
import type { ContactProfile } from '@/domain/contacts/profile-view';
import { ContactEmailReplyPanel } from '@/features/contacts/email/contact-email-reply-panel';
import { ContactEmailSequenceBar } from '@/features/contacts/email/contact-email-sequence-bar';
import type { ContactEmailReplyDraftView } from '@/domain/contacts/outreach-sequence-view';
import { syncContactEmailRepliesAction } from '@/server/actions/contacts/contact-email-reply';
import { formatDateTime } from '@/features/opportunities/lib/format-duration';
import { sendContactEmailAction } from '@/server/actions/contacts/contact-email';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

async function fetchTemplates() {
  const response = await fetch('/api/v1/email-templates');
  if (!response.ok) throw new Error('Failed to load templates');
  const data = (await response.json()) as { items: ContactEmailTemplateView[] };
  return data.items;
}

async function fetchSequence(contactId: string) {
  const response = await fetch(`/api/v1/contacts/${contactId}/email-sequence`);
  if (!response.ok) throw new Error('Failed');
  const data = (await response.json()) as { sequence: ContactEmailSequenceView };
  return data.sequence;
}

async function fetchSendHistory(contactId: string) {
  const response = await fetch(`/api/v1/contacts/${contactId}/emails`);
  if (!response.ok) return [];
  const data = (await response.json()) as { items: ContactEmailSendView[] };
  return data.items;
}

export function ContactEmailWorkflow({
  profile,
  orgName,
  senderName,
  bulkContactIds,
}: {
  profile: ContactProfile;
  orgName: string;
  senderName: string;
  bulkContactIds?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const contactIds = useMemo(() => {
    if (bulkContactIds && bulkContactIds.length > 0) return bulkContactIds;
    const bulk = searchParams.get('bulk');
    if (bulk) {
      const ids = bulk.split(',').filter(Boolean);
      if (ids.length > 0) return ids;
    }
    return [profile.id];
  }, [bulkContactIds, profile.id, searchParams]);

  const multi = contactIds.length > 1;

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: fetchTemplates,
  });

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['contact-emails', profile.id],
    queryFn: () => fetchSendHistory(profile.id),
    enabled: !multi,
  });

  const { data: sequence } = useQuery({
    queryKey: ['contact-email-sequence', profile.id],
    queryFn: () => fetchSequence(profile.id),
    enabled: !multi,
  });

  const [templateId, setTemplateId] = useState('');
  const [stepKey, setStepKey] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [newStepMode, setNewStepMode] = useState(false);
  const [newStepLabel, setNewStepLabel] = useState('');
  const [pending, setPending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [scheduleNextReminder, setScheduleNextReminder] = useState(true);
  const [advanceSequence, setAdvanceSequence] = useState(true);
  const [replyDraft, setReplyDraft] = useState<ContactEmailReplyDraftView | null>(null);
  const [replySyncDone, setReplySyncDone] = useState(false);
  const sequenceStepRef = useRef<number | null>(null);

  const refreshReplyState = useCallback(async () => {
    if (multi) return;
    const result = await syncContactEmailRepliesAction({
      contactId: profile.id,
      orgName,
      senderName,
    });
    if (result.ok) {
      setReplyDraft(result.data.draft);
      if (result.data.foundReply) {
        toast.message('New reply detected', {
          description: 'Team notified — review the AI draft below.',
        });
        void queryClient.invalidateQueries({ queryKey: ['contact-email-sequence', profile.id] });
        void queryClient.invalidateQueries({ queryKey: ['contact-activity', profile.id] });
      }
    }
  }, [multi, orgName, profile.id, queryClient, senderName]);

  useEffect(() => {
    if (multi || replySyncDone) return;
    setReplySyncDone(true);
    void refreshReplyState();
  }, [multi, replySyncDone, refreshReplyState]);

  const selected = useMemo(
    () => templates.find((t) => t.id === templateId) ?? null,
    [templates, templateId],
  );

  const mergeCtx = useMemo(
    () =>
      buildEmailMergeContext({
        firstName: profile.firstName,
        lastName: profile.lastName,
        displayName: profile.displayName,
        companyName: profile.companyName,
        senderName,
        orgName,
      }),
    [profile, orgName, senderName],
  );

  const previewSubject = useMemo(
    () => mergeEmailTemplate(subject, mergeCtx),
    [subject, mergeCtx],
  );
  const previewHtml = useMemo(
    () => mergeEmailTemplate(bodyHtml, mergeCtx),
    [bodyHtml, mergeCtx],
  );

  const applyTemplate = useCallback((template: ContactEmailTemplateView) => {
    setTemplateId(template.id);
    setStepKey(template.stepKey);
    setTemplateName(template.name);
    setSubject(template.subject);
    setBodyHtml(template.bodyHtml);
    setShowPreview(false);
  }, []);

  useEffect(() => {
    if (templates.length === 0 || multi) return;

    const currentStep = sequence?.steps.find((s) => s.status === 'current');
    const stepIndex = currentStep?.index ?? -1;

    if (sequence && stepIndex >= 0) {
      if (sequenceStepRef.current === stepIndex) return;
      sequenceStepRef.current = stepIndex;
      const match =
        templates.find((t) => t.stepKey === currentStep!.stepKey) ??
        templates.find((t) => t.stepKey === defaultStepKeyForLifecycle(profile.lifecycle)) ??
        templates[0]!;
      applyTemplate(match);
      return;
    }

    if (!sequence) {
      const preferredKey = defaultStepKeyForLifecycle(profile.lifecycle);
      const match = templates.find((t) => t.stepKey === preferredKey) ?? templates[0]!;
      applyTemplate(match);
    }
  }, [templates, profile.lifecycle, sequence, multi, applyTemplate, sequence?.sequenceKey]);

  const insertToken = (token: string) => {
    const el = bodyRef.current;
    if (!el) {
      setBodyHtml((prev) => `${prev}${token}`);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = `${el.value.slice(0, start)}${token}${el.value.slice(end)}`;
    setBodyHtml(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const send = useCallback(async () => {
    if (!subject.trim() || !bodyHtml.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    const resolvedStepKey = newStepMode
      ? normaliseCustomStepKey(newStepLabel || templateName)
      : stepKey;

    if (newStepMode && resolvedStepKey.length < 2) {
      toast.error('Give the new step a name');
      return;
    }

    setPending(true);
    try {
      const result = await sendContactEmailAction({
        contactIds,
        subject: subject.trim(),
        bodyHtml: bodyHtml.trim(),
        templateId: selected?.id,
        stepKey: resolvedStepKey,
        saveTemplate: saveTemplate
          ? {
              templateId: newStepMode ? undefined : selected?.id,
              stepKey: resolvedStepKey,
              name: newStepMode ? newStepLabel.trim() || templateName : templateName,
              subject: subject.trim(),
              bodyHtml: bodyHtml.trim(),
            }
          : undefined,
        advanceSequence: multi ? false : advanceSequence,
        scheduleNextReminder: multi ? false : scheduleNextReminder,
      });

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      const { sent, failed, skipped } = result.data;
      if (sent === 0 && failed === 0) {
        toast.message('No emails sent', {
          description: `${skipped} skipped (DND, missing email, or restricted).`,
        });
      } else {
        toast.success(`Sent ${sent} email${sent === 1 ? '' : 's'}`, {
          description: [failed ? `${failed} failed` : null, skipped ? `${skipped} skipped` : null]
            .filter(Boolean)
            .join(' · '),
        });
      }

      void queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      void queryClient.invalidateQueries({ queryKey: ['contact-emails', profile.id] });
      void queryClient.invalidateQueries({ queryKey: ['contact-activity', profile.id] });
      void queryClient.invalidateQueries({ queryKey: ['contact-profile', profile.id] });
      void queryClient.invalidateQueries({ queryKey: ['contact-email-sequence', profile.id] });

      if (multi) {
        router.push('/contacts');
      } else {
        sequenceStepRef.current = null;
        void refetchHistory();
      }
    } finally {
      setPending(false);
    }
  }, [
    bodyHtml,
    contactIds,
    multi,
    newStepLabel,
    newStepMode,
    profile.id,
    queryClient,
    refetchHistory,
    router,
    saveTemplate,
    selected?.id,
    stepKey,
    subject,
    templateName,
    advanceSequence,
    scheduleNextReminder,
  ]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        void send();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [send]);

  const emailBlocked = !profile.canContact.email.allowed;
  const canSend =
    !pending && !profile.restricted && !emailBlocked && (multi || Boolean(profile.email));

  const statusMessage = multi
    ? `Sending to ${contactIds.length} contacts · merge fields personalise each message`
    : null;
  const blockMessage = profile.restricted
    ? 'Restricted contact — outreach disabled.'
    : emailBlocked
      ? (profile.canContact.email.reason ?? 'Email not allowed.')
      : !multi && !profile.email
        ? 'Add an email address before sending.'
        : null;

  if (templatesLoading) {
    return (
      <p className="flex items-center gap-2 py-10 text-[13px] text-ink-500">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading…
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {!multi && replyDraft ? (
        <ContactEmailReplyPanel
          contactId={profile.id}
          draft={replyDraft}
          onUpdated={() => {
            setReplyDraft(null);
            void refreshReplyState();
            void queryClient.invalidateQueries({ queryKey: ['contact-email-sequence', profile.id] });
            void queryClient.invalidateQueries({ queryKey: ['contact-emails', profile.id] });
          }}
        />
      ) : null}

      {!multi ? (
        <ContactEmailSequenceBar
          contactId={profile.id}
          onCheckReplies={() => void refreshReplyState()}
          onSequenceChange={() => {
            sequenceStepRef.current = null;
          }}
        />
      ) : null}

      {blockMessage ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-[13px] font-medium text-amber-950">
          {blockMessage}
        </p>
      ) : statusMessage ? (
        <p className="text-[13px] font-medium text-ink-500">{statusMessage}</p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-line/80 bg-white shadow-panel">
        <div className="flex flex-wrap items-center gap-2 border-b border-line/70 px-4 py-3">
          <label className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 text-[12px] font-semibold text-ink-500">Template</span>
            <select
              className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-white px-2.5 text-[13px] font-medium text-ink-900"
              value={templateId}
              onChange={(event) => {
                const next = templates.find((t) => t.id === event.target.value);
                if (next) applyTemplate(next);
              }}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.stepLabel}
                </option>
              ))}
            </select>
          </label>
          <Link
            href="/settings/email-templates"
            className="shrink-0 text-[12px] font-semibold text-brand-700 hover:text-brand-800"
          >
            Edit templates
          </Link>
        </div>

        <div className="space-y-0 divide-y divide-line/70">
          {!multi ? (
            <div className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-14 shrink-0 text-[12px] font-semibold text-ink-500">To</span>
              <span className="flex min-w-0 items-center gap-2 truncate text-[13px] font-medium text-ink-900">
                <Mail className="size-3.5 shrink-0 text-ink-400" aria-hidden />
                {profile.email ?? '—'}
              </span>
            </div>
          ) : null}

          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-14 shrink-0 text-[12px] font-semibold text-ink-500">Subject</span>
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium text-ink-900 outline-none placeholder:text-ink-400"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={500}
              placeholder="Subject line"
              disabled={showPreview}
            />
          </div>

          <div className="px-4 py-3">
            {showPreview ? (
              <div className="min-h-[240px] rounded-xl bg-soft/50 px-3 py-3">
                <p className="text-[13px] font-bold text-ink-900">{previewSubject}</p>
                <div
                  className="prose prose-sm mt-3 max-w-none text-[13px] text-ink-700"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            ) : (
              <textarea
                ref={bodyRef}
                className="min-h-[240px] w-full resize-y border-0 bg-transparent text-[13px] leading-relaxed text-ink-900 outline-none"
                value={bodyHtml}
                onChange={(event) => setBodyHtml(event.target.value)}
                placeholder="Write your message…"
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line/70 px-4 py-2.5">
          <div className="relative">
            <select
              className="h-8 appearance-none rounded-lg border border-line bg-white pl-2.5 pr-8 text-[12px] font-semibold text-ink-700"
              defaultValue=""
              onChange={(event) => {
                const v = event.target.value;
                if (v) insertToken(v);
                event.target.value = '';
              }}
            >
              <option value="" disabled>
                Insert field
              </option>
              {EMAIL_MERGE_TOKEN_HELP.map((row) => (
                <option key={row.token} value={row.token}>
                  {row.description}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
          </div>

          <button
            type="button"
            className={cn(
              'h-8 rounded-lg px-2.5 text-[12px] font-semibold',
              showPreview ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-soft',
            )}
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? 'Back to edit' : 'Preview'}
          </button>

          {selected ? (
            <button
              type="button"
              className="h-8 rounded-lg px-2.5 text-[12px] font-semibold text-ink-600 hover:bg-soft"
              onClick={() => applyTemplate(selected)}
            >
              Reset
            </button>
          ) : null}

          <Button
            type="button"
            size="sm"
            className="ml-auto"
            disabled={!canSend}
            onClick={() => void send()}
          >
            <Send className="size-3.5" aria-hidden />
            {pending ? 'Sending…' : multi ? `Send (${contactIds.length})` : 'Send'}
          </Button>
        </div>
      </div>

      {!multi && sequence?.status === 'active' ? (
        <div className="flex flex-col gap-2 rounded-xl border border-line/60 bg-white/60 px-4 py-3 text-[13px] text-ink-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={advanceSequence}
              onChange={(event) => setAdvanceSequence(event.target.checked)}
            />
            Advance outreach sequence when this step sends
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={scheduleNextReminder}
              onChange={(event) => setScheduleNextReminder(event.target.checked)}
            />
            Create task reminder for the next step due date
          </label>
        </div>
      ) : null}

      <details className="rounded-xl border border-line/60 bg-white/60 px-4 py-2">
        <summary className="cursor-pointer py-1 text-[13px] font-semibold text-ink-700">
          Save changes to team template
        </summary>
        <div className="space-y-2 border-t border-line/60 pb-2 pt-3">
          <label className="flex items-center gap-2 text-[13px] text-ink-700">
            <input
              type="checkbox"
              checked={saveTemplate}
              onChange={(event) => setSaveTemplate(event.target.checked)}
            />
            {newStepMode ? 'Create new template' : `Update “${stepLabelForKey(stepKey)}” for everyone`}
          </label>
          <label className="flex items-center gap-2 text-[13px] text-ink-700">
            <input
              type="checkbox"
              checked={newStepMode}
              onChange={(event) => setNewStepMode(event.target.checked)}
            />
            Save as new step
          </label>
          {newStepMode ? (
            <input
              className="h-9 w-full rounded-lg border border-line px-3 text-[13px]"
              placeholder="New step name"
              value={newStepLabel}
              onChange={(event) => setNewStepLabel(event.target.value)}
            />
          ) : null}
        </div>
      </details>

      {!multi && history.length > 0 ? (
        <details className="rounded-xl border border-line/60 bg-white/60 px-4 py-2">
          <summary className="cursor-pointer py-1 text-[13px] font-semibold text-ink-700">
            Recent sends ({history.length})
          </summary>
          <ul className="divide-y divide-line/60 border-t border-line/60 pt-1">
            {history.slice(0, 8).map((row) => (
              <li key={row.id} className="py-2.5 text-[12px]">
                <p className="font-semibold text-ink-900">{row.subject}</p>
                <p className="mt-0.5 text-ink-500">
                  {row.status === 'sent' ? 'Sent' : row.status === 'failed' ? 'Failed' : 'Skipped'}
                  {' · '}
                  {formatDateTime(row.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <p className="text-center text-[11px] font-medium text-ink-400">
        Sends via connected Google Mail ·{' '}
        <Link href="/getting-started" className="text-brand-600 hover:underline">
          Connect account
        </Link>
        {' · '}
        ⌘+Enter to send
      </p>
    </div>
  );
}
