'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateOrgCrmSettingsAction } from '@/server/actions/settings/update-org-crm-settings';
import { Button } from '@/components/ui/button';

export function CrmSettingsForm({
  initialAutoLink,
  initialCollectDob,
}: {
  initialAutoLink: boolean;
  initialCollectDob: boolean;
}) {
  const [autoLink, setAutoLink] = useState(initialAutoLink);
  const [collectDob, setCollectDob] = useState(initialCollectDob);
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const result = await updateOrgCrmSettingsAction({
        autoLinkContactsByEmailDomain: autoLink,
        collectContactDateOfBirth: collectDob,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('CRM settings saved');
    });
  };

  return (
    <section className="rounded-xl2 border border-line/60 bg-white p-5 shadow-panel">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4 rounded border-line"
          checked={autoLink}
          disabled={pending}
          onChange={(event) => setAutoLink(event.target.checked)}
        />
        <span>
          <span className="block text-[14px] font-bold text-ink-900">
            Auto-link contacts by email domain
          </span>
          <span className="mt-1 block text-[13px] font-medium text-ink-500">
            When you add a contact with a work email, match them to an existing company by domain.
            Personal domains (Gmail, Outlook, etc.) are never used.
          </span>
        </span>
      </label>
      <label className="mt-4 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4 rounded border-line"
          checked={collectDob}
          disabled={pending}
          onChange={(event) => setCollectDob(event.target.checked)}
        />
        <span>
          <span className="block text-[14px] font-bold text-ink-900">
            Collect date of birth on new contacts
          </span>
          <span className="mt-1 block text-[13px] font-medium text-ink-500">
            Off by default. Only enable if you have a lawful reason to store it.
          </span>
        </span>
      </label>
      <div className="mt-4 flex justify-end">
        <Button type="button" disabled={pending} onClick={save}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </section>
  );
}
