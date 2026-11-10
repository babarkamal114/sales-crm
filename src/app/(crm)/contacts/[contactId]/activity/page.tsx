'use client';

import { useParams } from 'next/navigation';
import { ContactActivityTab } from '@/features/contacts/lead/tabs/contact-activity-tab';

export default function ContactActivityPage() {
  const params = useParams<{ contactId: string }>();
  return <ContactActivityTab contactId={params.contactId} />;
}
