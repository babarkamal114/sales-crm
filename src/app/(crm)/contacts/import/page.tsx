import type { Metadata } from 'next';
import { ContactsImportPage } from '@/features/contacts/workflows/contacts-import-page';

export const metadata: Metadata = { title: 'Import contacts' };

export default function ContactImportRoute() {
  return <ContactsImportPage />;
}
