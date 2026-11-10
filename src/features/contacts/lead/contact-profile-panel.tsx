'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, Copy, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import type { ContactProfile } from '@/domain/contacts/profile-view';
import { CONSENT_CHANNELS } from '@/domain/contacts/quick-view';
import { LIFECYCLE_LABEL } from '@/domain/contacts/lead-tabs';
import { ContactConsentDialog } from '@/features/contacts/components/contact-consent-dialog';
import { formatDateTime } from '@/features/opportunities/lib/format-duration';
import { EraseContactDialog } from '@/features/contacts/components/erase-contact-dialog';
import {
  deleteContactAction,
  setContactRestrictedAction,
} from '@/server/actions/contacts/contact-lifecycle';
import { requestContactExportAction } from '@/server/actions/contacts/contact-lifecycle';
import { updateContactFieldAction } from '@/server/actions/contacts/update-contact';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTrigger } from '@/components/ui/sheet';
import { DialogTitle } from '@/components/ui/dialog';
import { PillTabsList, PillTabsTrigger, Tabs, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const CHANNEL_LABEL = {
  email: 'Email',
  sms: 'SMS',
  call: 'Calls',
  whatsapp: 'WhatsApp',
} as const;

export function ContactProfilePanel({
  profile,
  role,
  onUpdated,
  className,
  mobileOnly,
}: {
  profile: ContactProfile;
  role: string;
  onUpdated: () => void;
  className?: string;
  mobileOnly?: boolean;
}) {
  const [consentOpen, setConsentOpen] = useState(false);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [fieldQuery, setFieldQuery] = useState('');
  const [pending, startTransition] = useTransition();

  const canAdmin = role === 'admin' || role === 'manager';
  const canErase = role === 'admin';

  type EditableField =
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'phone'
    | 'jobTitle'
    | 'source'
    | 'campaign'
    | 'socialUrl';

  const fieldGroups = useMemo(() => {
    const groups: {
      title: string;
      fields: { label: string; value: string; field?: EditableField }[];
    }[] = [
      {
        title: 'Identity',
        fields: [
          { label: 'First name', value: profile.firstName, field: 'firstName' },
          { label: 'Last name', value: profile.lastName, field: 'lastName' },
          { label: 'Job title', value: profile.jobTitle ?? '', field: 'jobTitle' },
          { label: 'Lifecycle', value: LIFECYCLE_LABEL[profile.lifecycle] ?? profile.lifecycle },
        ],
      },
      {
        title: 'Contact',
        fields: [
          { label: 'Email', value: profile.email ?? '', field: 'email' },
          { label: 'Phone', value: profile.phoneE164 ?? '', field: 'phone' },
          { label: 'Social', value: profile.socialUrl ?? '', field: 'socialUrl' },
        ],
      },
      {
        title: 'CRM',
        fields: [
          { label: 'Source', value: profile.source ?? '', field: 'source' },
          { label: 'Campaign', value: profile.campaign ?? '', field: 'campaign' },
          { label: 'Recipient type', value: profile.recipientType },
          { label: 'Created', value: formatDateTime(profile.createdAt) },
        ],
      },
    ];
    const q = fieldQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        fields: group.fields.filter(
          (f) =>
            f.label.toLowerCase().includes(q) ||
            String(f.value).toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.fields.length > 0);
  }, [fieldQuery, profile]);

  const saveField = (field: EditableField, value: string | null) => {
    startTransition(async () => {
      const result = await updateContactFieldAction({
        contactId: profile.id,
        version: profile.version,
        field,
        value,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Saved');
      onUpdated();
    });
  };

  const panelBody = (
    <Tabs defaultValue="fields" className="flex flex-col gap-3">
      <PillTabsList className="px-1">
        <PillTabsTrigger value="fields">All fields</PillTabsTrigger>
        <PillTabsTrigger value="consent">DND & consent</PillTabsTrigger>
        <PillTabsTrigger value="actions">Actions</PillTabsTrigger>
      </PillTabsList>

      <TabsContent value="fields" className="mt-0 space-y-3">
        <input
          className="h-9 w-full rounded-lg border border-line bg-white px-3 text-[13px]"
          placeholder="Search fields…"
          value={fieldQuery}
          onChange={(event) => setFieldQuery(event.target.value)}
        />
        {fieldGroups.map((group) => (
          <section key={group.title}>
            <h3 className="text-[12px] font-bold uppercase tracking-wide text-ink-400">
              {group.title}
            </h3>
            <dl className="mt-1.5 space-y-2">
              {group.fields.map((row) => (
                <div key={row.label} className="grid grid-cols-[110px_1fr] gap-2 text-[13px]">
                  <dt className="text-ink-500">{row.label}</dt>
                  <dd className="font-medium text-ink-900">
                    {row.field && !profile.restricted ? (
                      <InlineField
                        value={String(row.value)}
                        disabled={pending}
                        onSave={(value) => saveField(row.field!, value || null)}
                      />
                    ) : (
                      row.value || '—'
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </TabsContent>

      <TabsContent value="consent" className="mt-0 space-y-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={profile.restricted}
          onClick={() => setConsentOpen(true)}
        >
          Manage consent
        </Button>
        <div className="space-y-2">
          {CONSENT_CHANNELS.map((channel) => {
            const pref = profile.preferences.find((p) => p.channel === channel);
            return (
              <div
                key={channel}
                className="flex items-center justify-between rounded-xl bg-soft/80 px-3 py-2 text-[13px]"
              >
                <span className="font-semibold">{CHANNEL_LABEL[channel]}</span>
                <span
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[11px] font-bold',
                    pref?.dnd ? 'bg-rose-50 text-rose-700' : 'bg-mint-50 text-mint-800',
                  )}
                >
                  {pref?.dnd ? 'DND' : 'Allowed'}
                </span>
              </div>
            );
          })}
        </div>
      </TabsContent>

      <TabsContent value="actions" className="mt-0 flex flex-col gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={profile.restricted}>
          Add to pipeline
        </Button>
        <p className="text-[12px] text-ink-500">
          Use the duplicates banner above the action strip to merge records.
        </p>
        {canAdmin ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                startTransition(async () => {
                  const result = await requestContactExportAction({
                    contactId: profile.id,
                  });
                  if (!result.ok) toast.error(result.error.message);
                  else toast.success('Export requested');
                })
              }
            >
              Export (SAR)
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() =>
                startTransition(async () => {
                  const result = await setContactRestrictedAction({
                    contactId: profile.id,
                    version: profile.version,
                    restricted: !profile.restricted,
                  });
                  if (!result.ok) toast.error(result.error.message);
                  else {
                    toast.success(profile.restricted ? 'Restriction lifted' : 'Contact restricted');
                    onUpdated();
                  }
                })
              }
            >
              {profile.restricted ? 'Remove restriction' : 'Restrict contact'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-rose-700"
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteContactAction({
                    contactId: profile.id,
                    version: profile.version,
                  });
                  if (!result.ok) toast.error(result.error.message);
                  else toast.success('Contact deleted');
                })
              }
            >
              Delete contact
            </Button>
            {canErase ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="text-rose-800"
                onClick={() => setEraseOpen(true)}
              >
                Erase (GDPR)
              </Button>
            ) : null}
          </>
        ) : null}
      </TabsContent>
    </Tabs>
  );

  const identity = (
    <div className="border-b border-line pb-4">
      <span className="grid size-14 place-items-center rounded-full bg-brand-600 text-lg font-bold text-white">
        {profile.initials}
      </span>
      <h2 className="mt-3 text-[18px] font-extrabold text-ink-900">{profile.displayName}</h2>
      <p className="text-[13px] font-medium text-ink-500">
        {[profile.jobTitle, profile.companyName].filter(Boolean).join(' · ') || '—'}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">
          {LIFECYCLE_LABEL[profile.lifecycle] ?? profile.lifecycle}
        </span>
        {profile.tags.map((tag) => (
          <span
            key={tag.id}
            className="rounded-full bg-soft px-2 py-0.5 text-[11px] font-semibold text-ink-600"
          >
            {tag.name}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[12px] text-ink-500">
        Owner: <b className="text-ink-800">{profile.owner.fullName}</b>
      </p>
      {profile.followers.length > 0 ? (
        <p className="mt-1 text-[12px] text-ink-500">
          Followers: {profile.followers.map((f) => f.fullName).join(', ')}
        </p>
      ) : null}
      <div className="mt-3 space-y-1.5 text-[13px]">
        {profile.email ? (
          <a
            href={`mailto:${profile.email}`}
            className="flex items-center gap-2 font-medium text-brand-600"
          >
            <Mail className="size-3.5" />
            {profile.email}
            {profile.emailVerified ? <Check className="size-3.5 text-mint-700" /> : null}
            <CopyButton text={profile.email} />
          </a>
        ) : null}
        {profile.phoneE164 ? (
          <a
            href={`tel:${profile.phoneE164}`}
            className="flex items-center gap-2 font-medium text-ink-800"
          >
            <Phone className="size-3.5" />
            {profile.phoneE164}
            <CopyButton text={profile.phoneE164} />
          </a>
        ) : null}
        {profile.companyId && profile.companyName ? (
          <Link
            href={`/companies/${profile.companyId}`}
            className="text-[13px] font-semibold text-brand-600"
          >
            {profile.companyName}
          </Link>
        ) : null}
      </div>
    </div>
  );

  const inner = (
    <>
      {identity}
      {panelBody}
      <ContactConsentDialog
        open={consentOpen}
        onOpenChange={setConsentOpen}
        contactId={profile.id}
        version={profile.version}
        preferences={profile.preferences}
        onSaved={onUpdated}
      />
      <EraseContactDialog
        open={eraseOpen}
        onOpenChange={setEraseOpen}
        contactId={profile.id}
        displayName={profile.displayName}
        onErased={() => {
          window.location.href = '/contacts';
        }}
      />
    </>
  );

  if (mobileOnly) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button type="button" variant="secondary" className="w-full">
            Contact details
          </Button>
        </SheetTrigger>
        <SheetContent className="max-w-md overflow-y-auto">
          <SheetHeader>
            <DialogTitle>{profile.displayName}</DialogTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">{inner}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        'sticky top-4 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-xl2 border border-line/70 bg-panel p-4 shadow-panel backdrop-blur-xl',
        className,
      )}
    >
      {inner}
    </aside>
  );
}

function InlineField({
  value,
  disabled,
  onSave,
}: {
  value: string;
  disabled?: boolean;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <input
      className="w-full border-0 bg-transparent p-0 outline-none"
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft.trim() !== value.trim()) onSave(draft.trim());
      }}
    />
  );
}

function CopyButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="text-ink-400 hover:text-ink-700"
      aria-label="Copy"
      onClick={(event) => {
        event.preventDefault();
        void navigator.clipboard.writeText(text);
        toast.success('Copied');
      }}
    >
      <Copy className="size-3.5" />
    </button>
  );
}
