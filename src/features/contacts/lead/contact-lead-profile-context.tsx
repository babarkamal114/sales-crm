'use client';

import { createContext, useContext } from 'react';
import type { ContactProfile } from '@/domain/contacts/profile-view';

type LeadSession = {
  profile: ContactProfile;
  userId: string;
  role: string;
  orgName: string;
  senderName: string;
};

const ContactLeadProfileContext = createContext<LeadSession | null>(null);

export function ContactLeadProfileProvider({
  profile,
  userId,
  role,
  orgName,
  senderName,
  children,
}: {
  profile: ContactProfile;
  userId: string;
  role: string;
  orgName: string;
  senderName: string;
  children: React.ReactNode;
}) {
  return (
    <ContactLeadProfileContext.Provider
      value={{ profile, userId, role, orgName, senderName }}
    >
      {children}
    </ContactLeadProfileContext.Provider>
  );
}

export function useContactLeadProfile(): ContactProfile {
  return useContactLeadSession().profile;
}

export function useContactLeadSession(): LeadSession {
  const session = useContext(ContactLeadProfileContext);
  if (!session) {
    throw new Error('useContactLeadProfile must be used within ContactLeadLayout');
  }
  return session;
}
