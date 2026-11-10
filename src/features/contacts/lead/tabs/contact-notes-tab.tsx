'use client';

import { useContactLeadProfile } from '@/features/contacts/lead/contact-lead-profile-context';
import { ContactNotesPanel } from '@/features/contacts/components/contact-notes-panel';

export function ContactNotesTab({ currentUserId }: { currentUserId: string }) {
  const profile = useContactLeadProfile();
  return (
    <ContactNotesPanel
      contactId={profile.id}
      currentUserId={currentUserId}
      restricted={profile.restricted}
    />
  );
}
