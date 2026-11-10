'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Info,
  Mail,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Phone,
  Search,
  Send,
  StickyNote,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from '@/components/ui/sonner';
import {
  addConversationCommentAction,
  sendMessageAction,
} from '@/server/actions/conversations/send-message';
import { canSend } from '@/domain/conversations/can-send';
import { smsSegments } from '@/domain/conversations/sms-segments';
import type { MessageChannel } from '@/domain/conversations/types';
import { cn } from '@/lib/utils';
import type {
  InboxChannelFilter,
  InboxConversation,
  InboxScenario,
  InboxSort,
  InboxView,
  ThreadMessage,
} from '@/features/conversations/types/inbox-view';

type ComposerTab = MessageChannel | 'comment';

const CHANNEL_BADGE: Record<string, string> = {
  email: 'bg-[#4F7DBA]',
  sms: 'bg-[#3E8E8A]',
  whatsapp: 'bg-[#2F9E5B]',
  call: 'bg-[#8A5BB8]',
};

function fullName(c: InboxConversation) {
  return `${c.firstName} ${c.lastName}`;
}

function initials(c: InboxConversation) {
  return `${c.firstName[0]}${c.lastName[0]}`;
}

function waitingPill(minutes: number, unread: boolean) {
  if (!minutes || !unread) return null;
  const late = minutes >= 120;
  const label = minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 60)} h`;
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
        late ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700',
      )}
    >
      Waiting {label}
    </span>
  );
}

function ThreadItem({
  message,
  users,
}: {
  message: ThreadMessage;
  users: InboxScenario['users'];
}) {
  if (message.kind === 'day') {
    return (
      <div className="self-center rounded-full border border-line bg-white px-2.5 py-0.5 text-[12px] font-semibold text-ink-500">
        {message.label}
      </div>
    );
  }
  if (message.kind === 'event') {
    return (
      <div className="flex items-center justify-center gap-1.5 self-center text-center text-[12px] text-ink-500">
        {message.text}
        <span className="text-ink-300">·</span>
        {message.time}
      </div>
    );
  }
  if (message.kind === 'comment') {
    const author = users[message.by]?.name ?? 'Teammate';
    return (
      <div className="max-w-full self-stretch rounded-[14px] border border-dashed border-[#E7C98F] bg-[#FFF8EA] px-3.5 py-2.5">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
          <StickyNote className="size-3" />
          Internal comment · {author}
        </div>
        <p className="mt-1 whitespace-pre-wrap text-[14px] leading-[21px] text-ink-900">
          {message.text.split(/(@\w+)/g).map((part, i) =>
            part.startsWith('@') ? (
              <span key={i} className="font-semibold text-brand-700">
                {part}
              </span>
            ) : (
              part
            ),
          )}
        </p>
        <div className="mt-1 text-[11px] text-ink-500">{message.time}</div>
      </div>
    );
  }
  if (message.kind === 'call') {
    return (
      <div
        className={cn(
          'flex max-w-full items-center gap-3 self-center rounded-[14px] border border-line bg-white px-3.5 py-2.5 text-[13px]',
          message.missed && 'border-rose-100',
        )}
      >
        <div
          className={cn(
            'grid size-8 place-items-center rounded-[10px]',
            message.missed ? 'bg-rose-50 text-rose-700' : 'bg-[#F1ECFB] text-[#6A44B8]',
          )}
        >
          <Phone className="size-4" />
        </div>
        <div className="min-w-0">
          <b className="font-semibold text-ink-900">
            {message.missed ? 'Missed call' : message.direction === 'outbound' ? 'Outbound call' : 'Inbound call'}
          </b>
          <div className="text-ink-500">
            {message.duration ?? message.text}
            {message.by && users[message.by] ? ` · ${users[message.by]!.name}` : ''}
          </div>
        </div>
        {message.recording ? (
          <button type="button" className="ml-2 inline-flex h-[30px] items-center gap-1.5 rounded-[9px] bg-soft px-2.5 text-[12px] font-semibold">
            Recording
          </button>
        ) : null}
      </div>
    );
  }

  const isOut = message.direction === 'outbound';
  if (message.channel === 'email') {
    return (
      <div className={cn('w-full max-w-[560px]', isOut ? 'self-end' : 'self-start')}>
        <div
          className={cn(
            'overflow-hidden rounded-2xl border border-line bg-white',
            isOut && 'border-brand-100',
          )}
        >
          <div className={cn('border-b border-line px-3.5 py-2.5 text-[12px] text-ink-500', isOut && 'bg-brand-50')}>
            <b className="block text-[14px] leading-5 text-ink-900">{message.subject}</b>
            {isOut && message.by && users[message.by] ? `To ${users[message.by]!.name}` : 'Inbound email'}
          </div>
          <div className="whitespace-pre-wrap px-3.5 py-3 text-[14px] leading-[21px] text-ink-700">
            {message.text}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-500">
          {message.time}
          {message.status ? ` · ${message.status}` : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex max-w-[min(560px,78%)] flex-col gap-1', isOut ? 'self-end items-end' : 'self-start')}>
      <div
        className={cn(
          'whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[14px] leading-[21px]',
          isOut
            ? message.channel === 'whatsapp'
              ? 'rounded-br-md bg-[#E3F4E9] text-ink-900'
              : 'rounded-br-md bg-[#E3F0EF] text-ink-900'
            : 'rounded-bl-md border border-line bg-white text-ink-900',
        )}
      >
        {message.text}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-ink-500">
        {message.time}
        {message.status ? ` · ${message.status}` : null}
      </div>
    </div>
  );
}

export function ConversationsInbox({
  scenario,
  selectedId,
  onSelect,
  userId,
  onSent,
  initialComposerChannel,
}: {
  scenario: InboxScenario;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  userId: string;
  onSent?: () => void;
  initialComposerChannel?: string | null;
}) {
  const [isSending, startSend] = useTransition();
  const [view, setView] = useState<InboxView>('mine');
  const [channel, setChannel] = useState<InboxChannelFilter>('all');
  const [status, setStatus] = useState<'open' | 'snoozed' | 'closed'>('open');
  const [sort, setSort] = useState<InboxSort>('new');
  const [query, setQuery] = useState('');
  const [composerTab, setComposerTab] = useState<ComposerTab>('email');
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [ctxOpen, setCtxOpen] = useState(false);
  const [mobileReading, setMobileReading] = useState(false);

  const selected = useMemo(
    () => scenario.conversations.find((c) => c.id === selectedId) ?? null,
    [scenario.conversations, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    const fromUrl =
      initialComposerChannel === 'email' ||
      initialComposerChannel === 'sms' ||
      initialComposerChannel === 'whatsapp'
        ? initialComposerChannel
        : null;
    const ch = fromUrl
      ? fromUrl
      : selected.lastChannel === 'call'
        ? 'email'
        : (selected.lastChannel as ComposerTab);
    setComposerTab(ch === 'whatsapp' ? 'whatsapp' : ch);
    const lastEmail = [...selected.messages].reverse().find(
      (m) => m.kind === 'message' && m.channel === 'email' && m.subject,
    );
    if (lastEmail && lastEmail.kind === 'message' && lastEmail.subject) {
      setSubject(lastEmail.subject.startsWith('Re:') ? lastEmail.subject : `Re: ${lastEmail.subject}`);
    } else {
      setSubject('');
    }
    setBody('');
  }, [selected?.id, initialComposerChannel]);

  const filtered = useMemo(() => {
    let rows = scenario.conversations.filter((c) => c.status === status);
    if (view === 'mine') rows = rows.filter((c) => c.assigneeId === userId);
    if (view === 'unassigned') rows = rows.filter((c) => !c.assigneeId);
    if (channel !== 'all') {
      rows = rows.filter(
        (c) =>
          c.lastChannel === channel ||
          c.messages.some(
            (m) =>
              (m.kind === 'message' && m.channel === channel) ||
              (channel === 'call' && m.kind === 'call'),
          ),
      );
    }
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((c) =>
        `${fullName(c)} ${c.company} ${c.preview}`.toLowerCase().includes(q),
      );
    }
    if (sort === 'wait') {
      rows = [...rows].sort((a, b) => b.waitingMinutes - a.waitingMinutes);
    }
    return rows;
  }, [scenario.conversations, status, view, channel, query, sort, userId]);

  const viewCounts = useMemo(() => {
    const open = scenario.conversations.filter((c) => c.status === 'open');
    return {
      mine: open.filter((c) => c.assigneeId === userId).length,
      unassigned: open.filter((c) => !c.assigneeId).length,
      all: open.length,
    };
  }, [scenario.conversations, userId]);

  const gate = useMemo(() => {
    if (!selected || composerTab === 'comment') {
      return { allowed: true, mode: 'allowed' as const, reason: '' };
    }
    if (composerTab === 'email' || composerTab === 'sms' || composerTab === 'whatsapp') {
      return canSend({
        channel: composerTab,
        purpose: 'conversation',
        contact: selected.contact,
        consent: selected.consent,
        conversation: selected.conversation,
        now: new Date(),
        orgSettings: scenario.orgSettings,
      });
    }
    return { allowed: true, mode: 'allowed' as const, reason: '' };
  }, [selected, composerTab, scenario.orgSettings]);

  const smsInfo = useMemo(() => (composerTab === 'sms' ? smsSegments(body) : null), [composerTab, body]);

  const tabBlocked = useCallback(
    (tab: ComposerTab) => {
      if (!selected || tab === 'comment') return false;
      const r = canSend({
        channel: tab,
        purpose: 'conversation',
        contact: selected.contact,
        consent: selected.consent,
        conversation: selected.conversation,
        now: new Date(),
        orgSettings: scenario.orgSettings,
      });
      return !r.allowed || r.mode === 'template_only';
    },
    [selected, scenario.orgSettings],
  );

  const handleSelect = (id: string) => {
    onSelect(id);
    setMobileReading(true);
  };

  const handleSend = () => {
    if (!selected) return;
    if (!body.trim()) return;

    startSend(async () => {
      const clientId = crypto.randomUUID();
      if (composerTab === 'comment') {
        const result = await addConversationCommentAction({
          conversationId: selected.id,
          clientId,
          body: body.trim(),
        });
        if (!result.ok) {
          toast.error(result.error.message);
          return;
        }
        toast.success('Comment added');
        setBody('');
        onSent?.();
        return;
      }
      if (composerTab !== 'email' && composerTab !== 'sms' && composerTab !== 'whatsapp') return;

      const result = await sendMessageAction({
        conversationId: selected.id,
        clientId,
        channel: composerTab,
        purpose: 'conversation',
        bodyText: body.trim(),
        ...(composerTab === 'email' && subject.trim() ? { subject: subject.trim() } : {}),
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success(result.data.status === 'scheduled' ? 'Message scheduled' : 'Message sent');
      setBody('');
      onSent?.();
    });
  };

  const channelTabs: { id: ComposerTab; label: string; icon: React.ReactNode }[] = [
    { id: 'email', label: 'Email', icon: <Mail className="size-3.5" /> },
    { id: 'sms', label: 'SMS', icon: <MessageSquare className="size-3.5" /> },
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="size-3.5" /> },
    { id: 'comment', label: 'Comment', icon: <StickyNote className="size-3.5" /> },
  ];

  return (
    <div
      className={cn(
        'grid min-h-0 flex-1 overflow-hidden',
        'grid-cols-1 md:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(260px,300px)]',
        mobileReading && 'max-md:[&_.conv-list]:hidden max-md:[&_.conv-thread]:flex',
      )}
    >
      <div className="conv-list flex min-h-0 min-w-0 flex-col border-line md:border-r">
        <div className="flex shrink-0 flex-col gap-2.5 border-b border-line/80 px-3 py-3 sm:px-4">
          <div className="flex gap-0.5 rounded-xl bg-soft/90 p-0.5" role="tablist" aria-label="Inbox">
            {(
              [
                ['mine', 'Mine', viewCounts.mine],
                ['unassigned', 'Unassigned', viewCounts.unassigned],
                ['all', 'All', viewCounts.all],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => setView(key)}
                className={cn(
                  'inline-flex flex-1 items-center justify-center gap-1 rounded-[9px] py-1.5 text-[12px] font-semibold sm:text-[13px]',
                  view === key ? 'bg-white text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-700',
                )}
              >
                {label}
                <span className="num rounded-full bg-brand-50 px-1.5 text-[10px] font-semibold text-brand-700 sm:text-[11px]">
                  {count}
                </span>
              </button>
            ))}
          </div>
          <label className="flex h-9 items-center gap-2 rounded-xl border border-line/80 bg-white px-3 text-ink-400 shadow-[0_1px_0_rgba(25,29,40,0.02)]">
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="sr-only">Search conversations</span>
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-ink-900 outline-none placeholder:text-ink-400"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-500">
            <label className="inline-flex items-center gap-1.5">
              <span className="font-medium text-ink-400">Status</span>
              <select
                className="cursor-pointer rounded-lg border-0 bg-soft/80 py-1 pl-2 pr-6 text-[12px] font-semibold text-ink-800"
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
              >
                <option value="open">Open</option>
                <option value="snoozed">Snoozed</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <label className="inline-flex items-center gap-1.5">
              <span className="font-medium text-ink-400">Channel</span>
              <select
                className="cursor-pointer rounded-lg border-0 bg-soft/80 py-1 pl-2 pr-6 text-[12px] font-semibold text-ink-800"
                value={channel}
                onChange={(e) => setChannel(e.target.value as InboxChannelFilter)}
              >
                <option value="all">All</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="call">Calls</option>
              </select>
            </label>
            <label className="ml-auto inline-flex items-center gap-1.5">
              <span className="font-medium text-ink-400">Sort</span>
              <select
                className="cursor-pointer rounded-lg border-0 bg-soft/80 py-1 pl-2 pr-6 text-[12px] font-semibold text-ink-800"
                value={sort}
                onChange={(e) => setSort(e.target.value as InboxSort)}
              >
                <option value="new">Newest</option>
                <option value="wait">Waiting</option>
              </select>
            </label>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto" role="listbox">
          {filtered.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-ink-500">
              <p className="font-semibold text-ink-700">Nothing here</p>
              No conversations match this view.
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={c.id === selectedId}
                onClick={() => handleSelect(c.id)}
                className={cn(
                  'relative grid w-full grid-cols-[36px_minmax(0,1fr)] gap-2.5 border-b border-line/70 px-3 py-2.5 text-left transition-colors hover:bg-soft/80 sm:px-4',
                  c.id === selectedId &&
                    'bg-brand-50/80 before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-r before:bg-brand-600',
                  c.unread && 'conv-unread',
                )}
              >
                <div className="relative size-9 self-start">
                  <span
                    className={cn(
                      'grid size-9 place-items-center rounded-full text-[12px] font-semibold text-white ring-2 ring-white',
                      c.avatarClass,
                    )}
                  >
                    {initials(c)}
                  </span>
                  {c.unread ? (
                    <span
                      className={cn(
                        'absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-white',
                        CHANNEL_BADGE[c.lastChannel] ?? CHANNEL_BADGE.email,
                      )}
                      aria-hidden
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <b className="truncate text-[13px] font-semibold text-ink-900">{fullName(c)}</b>
                    <time
                      className={cn(
                        'ml-auto shrink-0 text-[11px] text-ink-400 num',
                        c.unread && 'font-semibold text-brand-700',
                      )}
                    >
                      {c.timeLabel}
                    </time>
                  </div>
                  {c.company ? (
                    <p className="truncate text-[11px] text-ink-400">{c.company}</p>
                  ) : null}
                  <p
                    className={cn(
                      'mt-0.5 line-clamp-1 text-[13px] leading-snug text-ink-500',
                      c.unread && 'font-medium text-ink-800',
                    )}
                  >
                    {c.preview}
                  </p>
                  {(waitingPill(c.waitingMinutes, c.unread) || c.snoozeLabel) && (
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {waitingPill(c.waitingMinutes, c.unread)}
                      {c.snoozeLabel ? (
                        <span className="text-[11px] text-ink-400">Snoozed · {c.snoozeLabel}</span>
                      ) : null}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="conv-thread hidden min-h-0 min-w-0 flex-col overflow-hidden md:flex">
        {!selected ? (
          <div className="grid flex-1 place-items-center text-[13px] text-ink-500">
            Select a conversation to read and reply.
          </div>
        ) : (
          <>
            <header className="flex shrink-0 items-center gap-3 border-b border-line/80 px-3 py-2.5 sm:px-4">
              <button
                type="button"
                className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-600 hover:bg-soft md:hidden"
                aria-label="Back to conversations"
                onClick={() => setMobileReading(false)}
              >
                <ArrowLeft className="size-[18px]" />
              </button>
              <span
                className={cn(
                  'hidden size-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-white sm:grid',
                  selected.avatarClass,
                )}
              >
                {initials(selected)}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/contacts/${selected.contactId}`}
                  className="block truncate text-[15px] font-semibold text-ink-900 hover:text-brand-700"
                >
                  {fullName(selected)}
                </Link>
                <small className="block truncate text-[12px] text-ink-500">
                  {[selected.role, selected.company].filter(Boolean).join(' · ')}
                </small>
              </div>
              <button
                type="button"
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-line/80 bg-white text-ink-600 hover:bg-soft xl:hidden"
                aria-label="Contact details"
                onClick={() => setCtxOpen(true)}
              >
                <Info className="size-4" />
              </button>
            </header>

            <div
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-gradient-to-b from-soft/40 to-transparent px-3 py-4 sm:px-5 sm:py-5"
              aria-live="polite"
            >
              {selected.messages.map((m, i) => (
                <ThreadItem key={i} message={m} users={scenario.users} />
              ))}
            </div>

            <div className="shrink-0 border-t border-line/80 bg-white px-3 py-3 sm:px-4" id="composer">
              <div
                className="mb-2.5 flex gap-0.5 overflow-x-auto rounded-xl bg-soft/70 p-0.5 scrollbar-none"
                role="tablist"
                aria-label="Reply channel"
              >
                {channelTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={composerTab === tab.id}
                    onClick={() => setComposerTab(tab.id)}
                    className={cn(
                      'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[9px] px-2.5 text-[12px] font-semibold sm:text-[13px]',
                      composerTab === tab.id && tab.id === 'comment' && 'bg-[#FFF1D6] text-amber-800 shadow-sm',
                      composerTab === tab.id && tab.id !== 'comment' && 'bg-white text-brand-700 shadow-sm',
                      composerTab !== tab.id && 'text-ink-500 hover:text-ink-700',
                    )}
                  >
                    {tab.icon}
                    <span className="hidden min-[420px]:inline">{tab.label}</span>
                    {tabBlocked(tab.id) ? (
                      <span className="size-1.5 rounded-full bg-rose-500" aria-label="Blocked" />
                    ) : null}
                  </button>
                ))}
              </div>

              {(composerTab === 'sms' || composerTab === 'whatsapp') &&
              scenario.orgSettings.managedSpendAlert &&
              gate.allowed ? (
                <p className="mb-2 rounded-lg bg-amber-50/90 px-2.5 py-2 text-[12px] text-amber-900">
                  Managed channel usage is over 80% of this month&apos;s limit —{' '}
                  <Link href="/settings/channels/usage" className="font-bold underline">
                    review usage
                  </Link>
                  .
                </p>
              ) : null}

              {gate.reason && composerTab !== 'comment' ? (
                <div
                  role="status"
                  className={cn(
                    'mb-2 flex items-start gap-2 rounded-lg px-2.5 py-2 text-[12px] leading-[18px] sm:text-[13px]',
                    gate.mode === 'blocked' && 'bg-rose-50/90 text-rose-700',
                    (gate.mode === 'template_only' || gate.mode === 'warn_quiet_hours') &&
                      'bg-amber-50/90 text-amber-800',
                  )}
                >
                  <span className="flex-1">{gate.reason}</span>
                  {gate.mode === 'template_only' ? (
                    <button type="button" className="shrink-0 font-bold underline">
                      Choose template
                    </button>
                  ) : null}
                  {!scenario.orgSettings.emailDomainVerified && composerTab === 'email' ? (
                    <span className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <Link
                        href="/api/integrations/google_mail/start?return=%2Fconversations"
                        className="font-bold underline"
                      >
                        Google
                      </Link>
                      <Link
                        href="/api/integrations/microsoft_mail/start?return=%2Fconversations"
                        className="font-bold underline"
                      >
                        Microsoft
                      </Link>
                      <Link href="/settings/channels" className="font-bold underline">
                        Channels
                      </Link>
                    </span>
                  ) : null}
                  {!scenario.orgSettings.whatsappConnected && composerTab === 'whatsapp' ? (
                    <Link href="/settings/channels" className="shrink-0 font-bold underline">
                      Set up WhatsApp
                    </Link>
                  ) : null}
                  {!scenario.orgSettings.smsConnected && composerTab === 'sms' ? (
                    <Link href="/settings/channels" className="shrink-0 font-bold underline">
                      Set up SMS
                    </Link>
                  ) : null}
                </div>
              ) : null}

              {composerTab === 'email' ? (
                <input
                  className="mb-2 h-9 w-full rounded-xl border border-line/80 bg-soft/30 px-3 text-[13px] text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-50"
                  aria-label="Subject"
                  placeholder="Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              ) : null}

              <div
                className={cn(
                  'rounded-xl border border-line/80 bg-white focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-50/80',
                  composerTab === 'comment' && 'border-amber-200/80 bg-[#FFFBF2]',
                )}
              >
                <textarea
                  id="composer-body"
                  rows={2}
                  className="block min-h-[56px] max-h-[160px] w-full resize-none border-0 bg-transparent px-3 py-2.5 text-[14px] leading-[21px] text-ink-900 outline-none disabled:cursor-not-allowed disabled:text-ink-500"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  readOnly={composerTab === 'whatsapp' && gate.mode === 'template_only'}
                  placeholder={
                    composerTab === 'comment'
                      ? 'Add an internal note — never sent to the contact'
                      : 'Write your message…'
                  }
                />
                <div className="flex items-center gap-0.5 px-2 pb-2 pt-0.5">
                  {composerTab !== 'sms' && composerTab !== 'comment' ? (
                    <button
                      type="button"
                      className="grid size-8 place-items-center rounded-lg text-ink-400 hover:bg-soft hover:text-ink-600"
                      aria-label="Attach"
                    >
                      <Paperclip className="size-4" />
                    </button>
                  ) : null}
                  {composerTab === 'sms' && smsInfo ? (
                    <span
                      className={cn(
                        'ml-1 text-[12px] text-ink-500 num',
                        smsInfo.segments > 1 && 'font-semibold text-amber-700',
                      )}
                    >
                      {smsInfo.length} chars · {smsInfo.segments} part{smsInfo.segments === 1 ? '' : 's'} ({smsInfo.encoding})
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={
                      isSending ||
                      (composerTab !== 'comment' &&
                        (!gate.allowed || gate.mode === 'blocked' || gate.mode === 'template_only'))
                    }
                    className={cn(
                      'ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-ink-300',
                      composerTab === 'comment' ? 'bg-amber-700 hover:bg-amber-800' : 'bg-brand-600 hover:bg-brand-700',
                    )}
                  >
                    <Send className="size-3.5" />
                    {composerTab === 'comment' ? 'Comment' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <aside
        className={cn(
          'min-h-0 min-w-0 flex-col overflow-y-auto border-line bg-soft/30 p-3 sm:p-4 xl:flex xl:border-l',
          ctxOpen &&
            'fixed inset-y-0 right-0 z-40 flex w-[min(320px,100%)] border-l bg-white/95 shadow-overlay backdrop-blur-md xl:relative xl:w-auto xl:bg-soft/30 xl:shadow-none',
          !ctxOpen && 'hidden xl:flex',
        )}
        aria-label="Contact details"
      >
        {selected ? (
          <ContactPanel conversation={selected} scenario={scenario} onClose={() => setCtxOpen(false)} />
        ) : null}
      </aside>
      {ctxOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink-900/25 xl:hidden"
          aria-label="Close contact panel"
          onClick={() => setCtxOpen(false)}
        />
      ) : null}
    </div>
  );
}

function ContactPanel({
  conversation: c,
  scenario,
  onClose,
}: {
  conversation: InboxConversation;
  scenario: InboxScenario;
  onClose: () => void;
}) {
  const channels: { key: MessageChannel; label: string }[] = [
    { key: 'email', label: 'Email' },
    { key: 'sms', label: 'SMS' },
    { key: 'whatsapp', label: 'WhatsApp' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between xl:hidden">
        <span className="text-[13px] font-semibold text-ink-700">Details</span>
        <button type="button" className="text-[13px] font-semibold text-brand-700" onClick={onClose}>
          Done
        </button>
      </div>
      <div className="divide-y divide-line/70 rounded-2xl border border-line/70 bg-white">
        <section className="p-3.5">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white',
                c.avatarClass,
              )}
            >
              {initials(c)}
            </span>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-[15px] font-semibold text-ink-900">{fullName(c)}</b>
              <small className="block truncate text-[12px] text-ink-500">{c.role}</small>
              {c.companyId ? (
                <Link
                  href={`/companies/${c.companyId}`}
                  className="mt-1 block truncate text-[12px] font-medium text-brand-700"
                >
                  {c.company}
                </Link>
              ) : c.company ? (
                <p className="mt-1 truncate text-[12px] text-ink-500">{c.company}</p>
              ) : null}
            </div>
            <Link
              href={`/contacts/${c.contactId}`}
              className="shrink-0 text-[12px] font-semibold text-brand-700"
            >
              Open
            </Link>
          </div>
        </section>

        <section className="p-3.5">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Channels</h4>
          <ul className="space-y-1.5">
            {channels.map(({ key, label }) => {
              const r = canSend({
                channel: key,
                purpose: 'conversation',
                contact: c.contact,
                consent: c.consent,
                conversation: c.conversation,
                now: new Date(),
                orgSettings: scenario.orgSettings,
              });
              let pill = 'OK';
              let pillClass = 'text-mint-700 bg-mint-50/80';
              if (!r.allowed) {
                pill = r.reason.includes('STOP') ? 'STOP' : 'Blocked';
                pillClass = 'text-rose-700 bg-rose-50/80';
              } else if (r.mode === 'template_only') {
                pill = 'Template';
                pillClass = 'text-amber-800 bg-amber-50/80';
              } else if (key === 'whatsapp' && r.reason.includes('window open')) {
                pill = 'Window open';
                pillClass = 'text-mint-700 bg-mint-50/80';
              }
              return (
                <li key={key} className="flex items-center justify-between text-[13px] text-ink-700">
                  {label}
                  <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-semibold', pillClass)}>
                    {pill}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {c.deal ? (
          <section className="p-3.5">
            <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Deal</h4>
            <b className="block text-[13px] font-semibold text-ink-900">{c.deal.title}</b>
            <small className="text-[12px] text-ink-500">{c.deal.stage}</small>
            <div className="mt-1.5 text-[15px] font-bold text-ink-900 num">
              £{c.deal.value.toLocaleString('en-GB')}
            </div>
          </section>
        ) : null}

        <section className="p-3.5">
          <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">Next task</h4>
          {c.task ? (
            <p className="text-[13px] text-ink-800">{c.task}</p>
          ) : (
            <p className="text-[12px] leading-relaxed text-ink-500">No task scheduled.</p>
          )}
        </section>
      </div>
    </div>
  );
}
