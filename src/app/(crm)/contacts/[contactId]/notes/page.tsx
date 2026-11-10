'use client';

import { ContactNotesTab } from '@/features/contacts/lead/tabs/contact-notes-tab';
import { useContactLeadSession } from '@/features/contacts/lead/contact-lead-profile-context';

export default function ContactNotesPage() {
  const { userId } = useContactLeadSession();
  return <ContactNotesTab currentUserId={userId} />;
}
