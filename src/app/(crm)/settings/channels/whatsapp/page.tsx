import type { Metadata } from 'next';
import { ContentPanel } from '@/components/layouts/app-header';
import { WhatsAppSettingsClient } from '@/features/channels/whatsapp-settings-client';
import { requireSession } from '@/server/auth/require-session';

export const metadata: Metadata = { title: 'WhatsApp · Channels' };

export default async function WhatsAppChannelsPage() {
  await requireSession();

  return (
    <ContentPanel className="pb-28">
      <WhatsAppSettingsClient />
    </ContentPanel>
  );
}
