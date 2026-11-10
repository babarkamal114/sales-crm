import type { Metadata } from 'next';
import { ContentPanel } from '@/components/layouts/app-header';
import { ContactEmailTemplatesSettings } from '@/features/contacts/email/contact-email-templates-settings';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { listContactEmailTemplates } from '@/server/services/contacts/contact-email-templates';

export const metadata: Metadata = { title: 'Email templates' };

type PageProps = { searchParams: Promise<{ template?: string }> };

export default async function EmailTemplatesSettingsPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const { template: selectedTemplateId } = await searchParams;
  const items = await withTenant(session, (tx) => listContactEmailTemplates(tx, session));

  return (
    <ContentPanel className="space-y-5 pb-28">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900">Email templates</h1>
        <p className="mt-1 text-[13px] font-medium text-ink-500">
          Pre-written messages for each outreach step. Teammates can customise before sending to a
          contact.
        </p>
      </div>
      <ContactEmailTemplatesSettings
        initialTemplates={items}
        initialSelectedTemplateId={selectedTemplateId}
      />
    </ContentPanel>
  );
}
