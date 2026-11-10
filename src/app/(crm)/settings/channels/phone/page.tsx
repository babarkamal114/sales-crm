import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPanel } from '@/components/layouts/app-header';
import { requireSession } from '@/server/auth/require-session';

export const metadata: Metadata = { title: 'Phone & SMS · Channels' };

export default async function PhoneChannelsPage() {
  await requireSession();

  return (
    <ContentPanel className="mx-auto max-w-2xl space-y-4 pb-28">
      <Link href="/settings/channels" className="text-[13px] font-semibold text-brand-700 hover:underline">
        ← Channels
      </Link>
      <h1 className="text-[22px] font-extrabold text-ink-900">Phone & SMS</h1>
      <p className="text-[13px] leading-relaxed text-ink-600">
        Managed UK numbers and regulatory bundle flow live in server services (
        <code className="text-[12px]">managed-telephony.ts</code>). A full admin UI for purchase and
        bundle status is planned in a follow-up; use the welcome checklist or API services for now.
      </p>
    </ContentPanel>
  );
}
