import type { Metadata } from 'next';
import { ContactsPageClient } from '@/features/contacts/contacts-page-client';
import { requireSession } from '@/server/auth/require-session';

export const metadata: Metadata = { title: 'Contacts' };

export default async function ContactsPage() {
  const session = await requireSession();
  return <ContactsPageClient role={session.role} userId={session.userId} />;
}
