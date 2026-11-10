import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { ContactLeadLayout } from '@/features/contacts/lead/contact-lead-layout';
import { NotFoundError } from '@/server/access/capabilities';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import { getContactProfile } from '@/server/services/contacts/get-contact-profile';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ contactId: string }>;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  try {
    const session = await requireSession();
    const { contactId } = await params;
    const profile = await withTenant(session, (tx) =>
      getContactProfile(tx, session, contactId),
    );
    return { title: profile.displayName };
  } catch {
    return { title: 'Contact' };
  }
}

export default async function ContactLeadRootLayout({ children, params }: LayoutProps) {
  const session = await requireSession();
  const { contactId } = await params;

  try {
    const profile = await withTenant(session, (tx) =>
      getContactProfile(tx, session, contactId),
    );

    return (
      <ContactLeadLayout
        contactId={contactId}
        initialProfile={profile}
        role={session.role}
        userId={session.userId}
        orgName={session.organisationName}
        senderName={session.fullName}
      >
        {children}
      </ContactLeadLayout>
    );
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }
}
