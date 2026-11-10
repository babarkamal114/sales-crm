import type { Metadata } from 'next';
import { ContentPanel } from '@/components/layouts/app-header';
import { ChannelsSettingsClient } from '@/features/channels/channels-settings-client';
import { requireSession } from '@/server/auth/require-session';

export const metadata: Metadata = { title: 'Channels · Settings' };

export default async function ChannelsSettingsPage() {
  await requireSession();

  return (
    <ContentPanel className="space-y-5 pb-28">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink-900">Channels</h1>
        <p className="mt-1 max-w-2xl text-[13px] font-medium text-ink-500">
          Connect mailboxes for email, and phone numbers for calls, SMS and WhatsApp. Managed
          services are billed by usage; bring-your-own uses your provider account.
        </p>
      </div>
      <ChannelsSettingsClient />
    </ContentPanel>
  );
}
