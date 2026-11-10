import type { ContactProfile } from '@/domain/contacts/profile-view';
import type { CreateOpportunityPrefill } from '@/lib/entities/create-prefill';

export function opportunityPrefillFromContact(profile: Pick<
  ContactProfile,
  'id' | 'companyId' | 'source' | 'campaign'
>): CreateOpportunityPrefill {
  return {
    contactId: profile.id,
    ...(profile.companyId ? { companyId: profile.companyId } : {}),
    ...(profile.source ? { source: profile.source } : {}),
    ...(profile.campaign ? { campaign: profile.campaign } : {}),
  };
}
