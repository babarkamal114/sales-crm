'use client';

import { useRouter } from 'next/navigation';
import { useContactLeadProfile } from '@/features/contacts/lead/contact-lead-profile-context';
import { ContactTasksPanel } from '@/features/contacts/components/contact-tasks-panel';

export function ContactTasksTab({ currentUserId }: { currentUserId: string }) {
  const profile = useContactLeadProfile();
  const router = useRouter();

  return (
    <ContactTasksPanel
      contactId={profile.id}
      currentUserId={currentUserId}
      restricted={profile.restricted}
      onChanged={() => router.refresh()}
    />
  );
}
