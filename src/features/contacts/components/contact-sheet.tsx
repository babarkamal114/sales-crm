'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  StickyNote,
  CheckSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import type { MarketingConsentState } from '@/domain/contacts/consent';
import { CONSENT_CHANNELS, type ContactQuickView } from '@/domain/contacts/quick-view';
import { ContactConsentDialog } from '@/features/contacts/components/contact-consent-dialog';
import {
  ContactQuickNoteDialog,
  ContactQuickTaskDialog,
} from '@/features/contacts/components/contact-quick-collaboration-dialogs';
import { openConversationForContact } from '@/features/conversations/lib/open-conversation-for-contact';
import { formatDateTime } from '@/features/opportunities/lib/format-duration';
import { formatOpportunityValue } from '@/features/opportunities/lib/format-money';
import {
  setContactTagsAction,
  updateContactFieldAction,
} from '@/server/actions/contacts/update-contact';
import {
  Sheet,
  SheetBody,
  SheetCloseButton,
  SheetContent,
  SheetHeader,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const TAG_CLASS: Record<string, string> = {
  t1: 'bg-brand-50 text-brand-700',
  t2: 'bg-purple-50 text-purple-700',
  t3: 'bg-teal-50 text-teal-800',
  t4: 'bg-amber-50 text-amber-800',
};

const CHANNEL_LABEL = {
  email: 'Email',
  sms: 'SMS',
  call: 'Calls',
  whatsapp: 'WhatsApp',
} as const;

const MARKETING_LABEL: Record<
  MarketingConsentState,
  { label: string; className: string }
> = {
  granted: { label: 'Consent given', className: 'bg-mint-50 text-mint-800' },
  denied: { label: 'Opted out', className: 'bg-rose-50 text-rose-800' },
  unknown: { label: 'Unknown', className: 'bg-amber-50 text-amber-800' },
};

async function fetchContact(contactId: string) {
  const response = await fetch(`/api/v1/contacts/${contactId}`);
  if (response.status === 404) throw new Error('NOT_FOUND');
  if (!response.ok) throw new Error('Failed');
  return response.json() as Promise<{ contact: ContactQuickView }>;
}

async function fetchTags() {
  const response = await fetch('/api/v1/tags');
  if (!response.ok) return [];
  const data = (await response.json()) as { items: { id: string; name: string }[] };
  return data.items;
}

async function fetchTeamMembers() {
  const response = await fetch('/api/v1/org/members');
  if (!response.ok) return [];
  const data = (await response.json()) as { items: { id: string; fullName: string }[] };
  return data.items;
}

export function ContactSheet({
  contactId,
  currentUserId,
  open,
  onOpenChange,
  onNavigateContact,
  onOpenDeal,
  orderedContactIds,
  onAfterClose,
}: {
  contactId: string | null;
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateContact: (id: string) => void;
  onOpenDeal: (dealId: string) => void;
  orderedContactIds: string[];
  onAfterClose?: (lastContactId: string | null) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const lastClosedIdRef = useRef<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const openConversationPage = useCallback(
    (id: string, channel: 'email' | 'sms') => {
      onOpenChange(false);
      void openConversationForContact(router, id, channel).then((ok) => {
        if (!ok) toast.error('Could not open conversation.');
      });
    },
    [onOpenChange, router],
  );

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['org-members'],
    queryFn: fetchTeamMembers,
    enabled: open,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['contact-quick', contactId],
    queryFn: () => fetchContact(contactId!),
    enabled: open && Boolean(contactId),
  });

  const contact = data?.contact;

  const nav = useMemo(() => {
    if (!contactId) {
      return { prevId: null as string | null, nextId: null as string | null, index: 0, total: 0 };
    }
    const index = orderedContactIds.indexOf(contactId);
    return {
      prevId: index > 0 ? (orderedContactIds[index - 1] ?? null) : null,
      nextId:
        index >= 0 && index < orderedContactIds.length - 1
          ? (orderedContactIds[index + 1] ?? null)
          : null,
      index: index >= 0 ? index + 1 : 0,
      total: orderedContactIds.length,
    };
  }, [contactId, orderedContactIds]);

  const goPrev = useCallback(() => {
    if (nav.prevId) onNavigateContact(nav.prevId);
  }, [nav.prevId, onNavigateContact]);

  const goNext = useCallback(() => {
    if (nav.nextId) onNavigateContact(nav.nextId);
  }, [nav.nextId, onNavigateContact]);

  useEffect(() => {
    if (contactId) lastClosedIdRef.current = contactId;
  }, [contactId]);

  useEffect(() => {
    if (open || !onAfterClose) return;
    onAfterClose(lastClosedIdRef.current);
  }, [open, onAfterClose]);

  useEffect(() => {
    if (!open || !contactId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (event.key === 'Escape') onOpenChange(false);
      if (event.key === 'j' || event.key === 'J') {
        event.preventDefault();
        goNext();
      }
      if (event.key === 'k' || event.key === 'K') {
        event.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, contactId, goNext, goPrev, onOpenChange]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['contact-quick', contactId] });
    void queryClient.invalidateQueries({ queryKey: ['contacts'] });
  };

  const saveField = (field: 'jobTitle' | 'email' | 'phone' | 'source', value: string | null) => {
    if (!contact) return;
    startTransition(async () => {
      const result = await updateContactFieldAction({
        contactId: contact.id,
        version: contact.version,
        field,
        value,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Contact updated');
      invalidate();
    });
  };

  const addTag = (tagId: string) => {
    if (!contact) return;
    const tagIds = [...new Set([...contact.tags.map((t) => t.id), tagId])];
    startTransition(async () => {
      const result = await setContactTagsAction({
        contactId: contact.id,
        version: contact.version,
        tagIds,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      invalidate();
    });
  };

  const nextBanner = (() => {
    if (!contact) return null;
    if (!contact.nextTaskDueAt) {
      return {
        tone: 'warn' as const,
        title: 'No next step.',
        detail: 'Nothing scheduled for this lead.',
        action: 'Add task',
      };
    }
    const due = new Date(contact.nextTaskDueAt);
    const overdue = due.getTime() < Date.now();
    return {
      tone: overdue ? ('warn' as const) : ('ok' as const),
      title: overdue ? 'Next step overdue' : 'Next step scheduled',
      detail: formatDateTime(contact.nextTaskDueAt),
      action: overdue ? 'Add task' : 'Done',
    };
  })();

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className="flex max-w-[520px] flex-col overflow-hidden rounded-l-3xl p-0"
          aria-describedby={undefined}
        >
          <SheetHeader className="space-y-0 border-b border-line px-5 py-0 pb-3.5 pt-[18px]">
            <div className="mb-3.5 flex items-center gap-1.5">
              <Button
                type="button"
                variant="icon"
                size="icon"
                aria-label="Previous (K)"
                disabled={!nav.prevId}
                onClick={goPrev}
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="icon"
                size="icon"
                aria-label="Next (J)"
                disabled={!nav.nextId}
                onClick={goNext}
              >
                <ChevronDown className="size-4" />
              </Button>
              {nav.total > 0 ? (
                <span className="text-[12px] font-semibold text-ink-400">
                  {nav.index} of {nav.total}
                </span>
              ) : null}
              <span className="flex-1" />
              {contact ? (
                <Button type="button" variant="ghost" size="sm" asChild>
                  <a href={`/contacts/${contact.id}`}>
                    Open full profile
                    <ExternalLink className="ml-1 size-3.5" />
                  </a>
                </Button>
              ) : null}
              <SheetCloseButton />
            </div>

            {isLoading ? (
              <Loader2 className="size-5 animate-spin text-brand-500" />
            ) : contact ? (
              <>
                <div className="flex gap-3.5">
                  <span className="grid size-[52px] place-items-center rounded-full bg-brand-600 text-[18px] font-bold text-white">
                    {contact.initials}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-[20px] font-extrabold text-ink-900">
                      {contact.displayName}
                    </h2>
                    <p className="truncate text-[13px] font-medium text-ink-500">
                      {[contact.jobTitle, contact.companyName].filter(Boolean).join(' · ') ||
                        'No title'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-soft py-0.5 pl-0.5 pr-2.5 text-[12px] font-semibold text-ink-700">
                    <span
                      className="grid size-5 place-items-center rounded-full text-[9px] font-bold text-white"
                      style={{ background: contact.owner.colour }}
                    >
                      {contact.owner.initials}
                    </span>
                    {contact.owner.fullName}
                  </span>
                  {contact.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[12px] font-semibold',
                        TAG_CLASS[tag.colourKey] ?? 'bg-brand-50 text-brand-700',
                      )}
                    >
                      {tag.name}
                    </span>
                  ))}
                  <TagAddButton contact={contact} onAdd={addTag} disabled={pending} />
                </div>
                <div className="mt-4 grid grid-cols-5 gap-2">
                  <ActionChip
                    icon={Phone}
                    label="Call"
                    allowed={contact.canContact.call.allowed}
                    reason={contact.canContact.call.reason}
                  />
                  <ActionChip
                    icon={Mail}
                    label="Email"
                    allowed={contact.canContact.email.allowed && !contact.restricted}
                    reason={contact.canContact.email.reason}
                    onActivate={() => openConversationPage(contact.id, 'email')}
                  />
                  <ActionChip
                    icon={MessageSquare}
                    label="SMS"
                    allowed={contact.canContact.sms.allowed && !contact.restricted}
                    reason={contact.canContact.sms.reason}
                    onActivate={() => openConversationPage(contact.id, 'sms')}
                  />
                  <ActionChip
                    icon={CheckSquare}
                    label="Task"
                    allowed={!contact.restricted}
                    onActivate={() => setTaskOpen(true)}
                  />
                  <ActionChip
                    icon={StickyNote}
                    label="Note"
                    allowed={!contact.restricted}
                    onActivate={() => setNoteOpen(true)}
                  />
                </div>
              </>
            ) : null}
          </SheetHeader>

          <SheetBody className="flex flex-col gap-3.5 px-5 py-0 pt-4 pb-6">
            {isError ? (
              <p className="py-8 text-center text-[13px] font-medium text-rose-700">
                Contact not available.{' '}
                <button type="button" className="underline" onClick={() => void refetch()}>
                  Retry
                </button>
              </p>
            ) : contact ? (
              <>
                {contact.restricted ? (
                  <p className="rounded-2xl bg-rose-50 px-3.5 py-3 text-[13px] font-semibold text-rose-800">
                    This contact is restricted. Edits and outreach are disabled.
                  </p>
                ) : null}

                {nextBanner ? (
                  <div
                    className={cn(
                      'flex flex-wrap items-center gap-2.5 rounded-2xl px-3.5 py-3 text-[13px]',
                      nextBanner.tone === 'ok'
                        ? 'bg-brand-50 text-brand-800'
                        : 'bg-amber-50 text-amber-900',
                    )}
                  >
                    <CheckSquare className="size-4 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <b className="block font-bold">{nextBanner.title}</b>
                      <span className="font-medium">{nextBanner.detail}</span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={contact.restricted}
                      onClick={() => setTaskOpen(true)}
                    >
                      {nextBanner.action}
                    </Button>
                  </div>
                ) : null}

                <section className="rounded-[18px] border border-line px-4 py-3.5">
                  <h3 className="mb-2.5 text-[13px] font-bold text-ink-900">Contact details</h3>
                  <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
                    <dt className="text-ink-500">Email</dt>
                    <dd className="flex items-center gap-1 font-medium text-ink-900">
                      <EditableValue
                        value={contact.email ?? ''}
                        placeholder="Add email"
                        disabled={contact.restricted || pending}
                        onSave={(value) => saveField('email', value || null)}
                      />
                      {contact.emailVerified ? (
                        <Check className="size-3.5 text-mint-700" aria-label="Verified" />
                      ) : null}
                      {contact.email ? (
                        <CopyButton text={contact.email} label="Copy email" />
                      ) : null}
                    </dd>
                    <dt className="text-ink-500">Phone</dt>
                    <dd className="flex items-center gap-1 font-medium text-ink-900">
                      <EditableValue
                        value={contact.phoneE164 ?? ''}
                        placeholder="Add phone"
                        disabled={contact.restricted || pending}
                        onSave={(value) => saveField('phone', value || null)}
                      />
                      {contact.phoneE164 ? (
                        <CopyButton text={contact.phoneE164} label="Copy phone" />
                      ) : null}
                    </dd>
                    <dt className="text-ink-500">Company</dt>
                    <dd className="font-medium text-brand-600">
                      {contact.companyName ?? '—'}
                    </dd>
                    <dt className="text-ink-500">Job title</dt>
                    <dd>
                      <EditableValue
                        value={contact.jobTitle ?? ''}
                        placeholder="Add title"
                        disabled={contact.restricted || pending}
                        onSave={(value) => saveField('jobTitle', value || null)}
                      />
                    </dd>
                    <dt className="text-ink-500">Source</dt>
                    <dd>
                      <EditableValue
                        value={contact.source ?? ''}
                        placeholder="—"
                        disabled={contact.restricted || pending}
                        onSave={(value) => saveField('source', value || null)}
                      />
                    </dd>
                    <dt className="text-ink-500">Created</dt>
                    <dd className="font-medium text-ink-700">
                      {formatDateTime(contact.createdAt)}
                    </dd>
                  </dl>
                </section>

                <section className="rounded-[18px] border border-line px-4 py-3.5">
                  <div className="mb-2.5 flex items-center gap-2">
                    <h3 className="text-[13px] font-bold text-ink-900">Contact preferences</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-7 text-[12px]"
                      disabled={contact.restricted}
                      onClick={() => setConsentOpen(true)}
                    >
                      Manage
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {CONSENT_CHANNELS.map((channel) => {
                      const pref = contact.preferences.find((row) => row.channel === channel);
                      const blocked = pref?.dnd ?? false;
                      return (
                        <div
                          key={channel}
                          className="flex items-center gap-2 rounded-xl bg-soft px-2.5 py-2 text-[13px]"
                        >
                          <b className="font-semibold text-ink-900">{CHANNEL_LABEL[channel]}</b>
                          <span
                            className={cn(
                              'ml-auto rounded-md px-1.5 py-0.5 text-[11px] font-bold',
                              blocked ? 'bg-rose-50 text-rose-700' : 'bg-mint-50 text-mint-800',
                            )}
                          >
                            {blocked ? 'DND' : 'Allowed'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2.5 text-[12px] leading-relaxed text-ink-500">
                    Marketing consent:{' '}
                    <span
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[11px] font-bold',
                        MARKETING_LABEL[contact.marketingConsent].className,
                      )}
                    >
                      {MARKETING_LABEL[contact.marketingConsent].label}
                    </span>
                  </p>
                </section>

                <section className="rounded-[18px] border border-line px-4 py-3.5">
                  <h3 className="mb-2.5 text-[13px] font-bold text-ink-900">Opportunities</h3>
                  <ul className="divide-y divide-line">
                    {contact.opportunities.length === 0 ? (
                      <li className="text-[13px] text-ink-500">No deals yet</li>
                    ) : (
                      contact.opportunities.map((deal) => (
                        <li key={deal.id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2.5 py-2.5 text-left first:pt-0"
                            onClick={() => onOpenDeal(deal.id)}
                          >
                            <span className="min-w-0 flex-1">
                              <b className="block truncate text-[13px] font-bold text-ink-900">
                                {deal.name}
                              </b>
                              <small className="text-[12px] text-ink-500">{deal.stageName}</small>
                            </span>
                            <StatusPill
                              status={
                                deal.status === 'won'
                                  ? 'Won'
                                  : deal.status === 'lost'
                                    ? 'Lost'
                                    : 'Open'
                              }
                              showDot={false}
                            />
                            {deal.status === 'open' || deal.status === 'won' ? (
                              <span className="num text-[13px] font-bold text-ink-800">
                                {formatOpportunityValue(deal.valuePence, 'GBP')}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </section>

                <section className="rounded-[18px] border border-line px-4 py-3.5">
                  <h3 className="mb-2.5 flex items-center text-[13px] font-bold text-ink-900">
                    Recent activity
                    {contact.id ? (
                      <a
                        className="ml-auto text-[12px] font-semibold text-brand-600"
                        href={`/contacts/${contact.id}`}
                      >
                        View all
                      </a>
                    ) : null}
                  </h3>
                  <ul className="flex flex-col gap-3">
                    {contact.recentActivity.length === 0 ? (
                      <li className="text-[13px] text-ink-500">No activity yet</li>
                    ) : (
                      contact.recentActivity.map((item) => (
                        <li key={item.id} className="text-[13px] font-medium text-ink-800">
                          {item.label}
                          <time className="ml-2 text-[12px] text-ink-400">
                            {formatDateTime(item.at)}
                          </time>
                        </li>
                      ))
                    )}
                  </ul>
                </section>
              </>
            ) : null}
          </SheetBody>

          {contact && !isError ? (
            <footer className="flex shrink-0 flex-wrap gap-x-3 gap-y-1 border-t border-line px-5 py-3 text-[12px] font-medium text-ink-500">
              <span>Owner: {contact.owner.fullName}</span>
              <span>
                Last activity:{' '}
                {contact.lastActivityAt ? formatDateTime(contact.lastActivityAt) : 'Never'}
              </span>
            </footer>
          ) : null}
        </SheetContent>
      </Sheet>

      {contact ? (
        <>
          <ContactConsentDialog
            open={consentOpen}
            onOpenChange={setConsentOpen}
            contactId={contact.id}
            version={contact.version}
            preferences={contact.preferences}
            onSaved={() => invalidate()}
          />
          <ContactQuickNoteDialog
            open={noteOpen}
            onOpenChange={setNoteOpen}
            contactId={contact.id}
            onPosted={() => invalidate()}
          />
          <ContactQuickTaskDialog
            open={taskOpen}
            onOpenChange={setTaskOpen}
            contactId={contact.id}
            currentUserId={currentUserId}
            teamMembers={teamMembers}
            onCreated={() => invalidate()}
          />
        </>
      ) : null}
    </>
  );
}

function ActionChip({
  icon: Icon,
  label,
  allowed,
  reason,
  onActivate,
}: {
  icon: typeof Phone;
  label: string;
  allowed: boolean;
  reason?: string | undefined;
  onActivate?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!allowed}
      title={!allowed ? reason ?? `${label} unavailable` : label}
      aria-disabled={!allowed}
      className={cn(
        'flex flex-col items-center gap-1 rounded-[14px] border border-line px-1 py-2.5 text-[12px] font-semibold',
        allowed
          ? 'bg-white text-ink-700 hover:border-brand-300 hover:text-brand-700'
          : 'cursor-not-allowed bg-soft text-ink-300',
      )}
      onClick={() => {
        if (!allowed) {
          toast.message(reason ?? `${label} is not available for this contact`);
          return;
        }
        onActivate?.();
      }}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </button>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  return (
    <button
      type="button"
      className="grid size-6 place-items-center rounded-md text-ink-400 hover:bg-soft hover:text-ink-700"
      aria-label={label}
      onClick={() => {
        void navigator.clipboard.writeText(text);
        toast.success('Copied');
      }}
    >
      <Copy className="size-3.5" />
    </button>
  );
}

function EditableValue({
  value,
  placeholder,
  disabled,
  onSave,
}: {
  value: string;
  placeholder: string;
  disabled?: boolean;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <input
      className="min-w-0 flex-1 border-0 bg-transparent p-0 font-medium text-ink-900 outline-none placeholder:text-ink-400 focus:ring-0"
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft.trim() !== value.trim()) onSave(draft.trim());
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function TagAddButton({
  contact,
  onAdd,
  disabled,
}: {
  contact: ContactQuickView;
  onAdd: (tagId: string) => void;
  disabled: boolean;
}) {
  const { data: tags } = useQuery({ queryKey: ['contact-tags'], queryFn: fetchTags });
  const available = (tags ?? []).filter((tag) => !contact.tags.some((t) => t.id === tag.id));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled || available.length === 0}
          className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[12px] font-semibold text-brand-600 hover:bg-brand-50 disabled:text-ink-300"
        >
          <Plus className="size-3.5" aria-hidden />
          Tag
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        {available.length === 0 ? (
          <p className="px-2 py-1.5 text-[12px] text-ink-500">No more tags</p>
        ) : (
          available.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className="block w-full rounded-lg px-2 py-1.5 text-left text-[13px] font-medium hover:bg-soft"
              onClick={() => onAdd(tag.id)}
            >
              {tag.name}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
