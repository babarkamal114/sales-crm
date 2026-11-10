import type { Metadata } from 'next';
import { ContentPanel } from '@/components/layouts/app-header';
import { UsageSettingsClient } from '@/features/channels/usage-settings-client';
import { requireSession } from '@/server/auth/require-session';

export const metadata: Metadata = { title: 'Usage · Channels' };

export default async function UsageChannelsPage() {
  await requireSession();

  return (
    <ContentPanel className="pb-28">
      <UsageSettingsClient />
    </ContentPanel>
  );
}
