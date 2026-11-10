'use client';

import { ContactTasksTab } from '@/features/contacts/lead/tabs/contact-tasks-tab';
import { useContactLeadSession } from '@/features/contacts/lead/contact-lead-profile-context';

export default function ContactTasksPage() {
  const { userId } = useContactLeadSession();
  return <ContactTasksTab currentUserId={userId} />;
}
