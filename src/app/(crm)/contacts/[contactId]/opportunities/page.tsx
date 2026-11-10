'use client';

import { useContactLeadProfile } from '@/features/contacts/lead/contact-lead-profile-context';
import { ContactOpportunitiesTab } from '@/features/contacts/lead/tabs/contact-opportunities-tab';

export default function ContactOpportunitiesPage() {
  const profile = useContactLeadProfile();
  return <ContactOpportunitiesTab profile={profile} />;
}
