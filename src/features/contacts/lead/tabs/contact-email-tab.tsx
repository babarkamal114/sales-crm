'use client';

import { ContactEmailWorkflow } from '@/features/contacts/email/contact-email-workflow';
import { useContactLeadSession } from '@/features/contacts/lead/contact-lead-profile-context';

export function ContactEmailTab() {
  const { profile, orgName, senderName } = useContactLeadSession();
  return (
    <ContactEmailWorkflow profile={profile} orgName={orgName} senderName={senderName} />
  );
}
