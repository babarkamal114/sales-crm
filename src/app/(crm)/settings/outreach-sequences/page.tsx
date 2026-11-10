import type { Metadata } from 'next';
import { ContentPanel } from '@/components/layouts/app-header';
import { ContactOutreachSequencesSettings } from '@/features/contacts/email/contact-outreach-sequences-settings';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { listContactEmailTemplates } from '@/server/services/contacts/contact-email-templates';
import { listOrgOutreachSequences } from '@/server/services/contacts/org-outreach-sequence';

export const metadata: Metadata = { title: 'Outreach sequences' };

export default async function OutreachSequencesSettingsPage() {
  const session = await requireSession();
  const [items, templates] = await withTenant(session, async (tx) => {
    const sequences = await listOrgOutreachSequences(tx, session);
    const emailTemplates = await listContactEmailTemplates(tx, session);
    return [sequences, emailTemplates] as const;
  });

  return (
    <ContentPanel className="space-y-5 pb-28">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900">
          Outreach sequences
        </h1>
        <p className="mt-1 text-[13px] font-medium text-ink-500">
          Create your own sequences or customise the built-in cadences. Pick any sequence on a
          contact&apos;s email page; new contacts still default to the lifecycle sequence.
        </p>
      </div>
      <ContactOutreachSequencesSettings initialItems={items} initialTemplates={templates} />
    </ContentPanel>
  );
}
