import type { Metadata } from 'next';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { CrmSettingsForm } from '@/features/settings/crm-settings-form';
import { ContentPanel } from '@/components/layouts/app-header';
import { assertCan, ForbiddenError } from '@/server/access/capabilities';
import { requireSession } from '@/server/auth/require-session';
import { organisationSettings } from '@/server/db/schema';
import { withTenant } from '@/server/db/with-tenant';

export const metadata: Metadata = { title: 'CRM settings' };

export default async function CrmSettingsPage() {
  const session = await requireSession();

  try {
    assertCan(session, 'settings.pipelines.manage');
  } catch {
    throw new ForbiddenError('Only admins can change CRM settings.');
  }

  const settings = await withTenant(session, async (tx) => {
    const [row] = await tx
      .select({
        autoLinkContactsByEmailDomain: organisationSettings.autoLinkContactsByEmailDomain,
        collectContactDateOfBirth: organisationSettings.collectContactDateOfBirth,
      })
      .from(organisationSettings)
      .where(eq(organisationSettings.orgId, session.orgId))
      .limit(1);
    return row;
  });

  return (
    <ContentPanel className="mx-auto max-w-lg space-y-5 pb-28">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft className="size-4" />
        Settings
      </Link>
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900">CRM</h1>
        <p className="mt-1 text-[13px] font-medium text-ink-500">
          Defaults for contacts and companies in your workspace.
        </p>
      </div>
      <CrmSettingsForm
        initialAutoLink={settings?.autoLinkContactsByEmailDomain ?? true}
        initialCollectDob={settings?.collectContactDateOfBirth ?? false}
      />
    </ContentPanel>
  );
}
