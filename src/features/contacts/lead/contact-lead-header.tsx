'use client';

import { useRouter } from 'next/navigation';
import { Mail, MessageSquare, Phone, StickyNote, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import { openConversationForContact } from '@/features/conversations/lib/open-conversation-for-contact';
import type { ContactProfile } from '@/domain/contacts/profile-view';
import { useCreateDialog } from '@/components/create-dialog';
import { opportunityPrefillFromContact } from '@/lib/entities/opportunity-prefill';
import { Button } from '@/components/ui/button';

export function ContactLeadHeader({
  profile,
  restricted,
  contactId,
}: {
  profile: ContactProfile;
  restricted: boolean;
  contactId: string;
}) {
  const router = useRouter();
  const { openCreate } = useCreateDialog();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl2 border border-line/70 bg-panel px-4 py-3 shadow-panel backdrop-blur-xl">
      {restricted ? (
        <p className="w-full rounded-lg bg-rose-50 px-3 py-2 text-[13px] font-semibold text-rose-800">
          Restricted contact — outreach and bulk actions are disabled.
        </p>
      ) : null}
      <ActionButton
        icon={Phone}
        label="Call"
        allowed={profile.canContact.call.allowed}
        reason={profile.canContact.call.reason}
        disabled={restricted}
      />
      <ActionButton
        icon={Mail}
        label="Email"
        allowed={profile.canContact.email.allowed}
        reason={profile.canContact.email.reason}
        disabled={restricted}
        onActivate={() => {
          void openConversationForContact(router, contactId, 'email').then((ok) => {
            if (!ok) toast.error('Could not open conversation.');
          });
        }}
      />
      <ActionButton
        icon={MessageSquare}
        label="SMS"
        allowed={profile.canContact.sms.allowed}
        reason={profile.canContact.sms.reason}
        disabled={restricted}
        onActivate={() => {
          void openConversationForContact(router, contactId, 'sms').then((ok) => {
            if (!ok) toast.error('Could not open conversation.');
          });
        }}
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={restricted}
        onClick={() => toast.message('Use the Tasks tab for follow-ups')}
      >
        <CheckSquare className="size-4" aria-hidden />
        Task
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={restricted}
        onClick={() => toast.message('Use the Notes tab for team notes')}
      >
        <StickyNote className="size-4" aria-hidden />
        Note
      </Button>
      <Button
        type="button"
        size="sm"
        className="ml-auto"
        disabled={restricted}
        onClick={() =>
          openCreate('opportunity', opportunityPrefillFromContact(profile))
        }
      >
        Add deal
      </Button>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  allowed,
  reason,
  disabled,
  onActivate,
}: {
  icon: typeof Phone;
  label: string;
  allowed: boolean;
  reason?: string | undefined;
  disabled?: boolean;
  onActivate?: () => void;
}) {
  const blocked = disabled || !allowed;
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={blocked}
      title={!allowed ? reason : undefined}
      onClick={() => {
        if (!allowed) toast.message(reason ?? `${label} unavailable`);
        else if (onActivate) onActivate();
        else toast.message(`${label} — connect dialler or composer in settings`);
      }}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
