import type { ChannelConsent, ConsentChannel, MarketingConsentState } from '@/domain/contacts/consent';
import { displayName, type ContactNameFields } from '@/domain/contacts/display-name';

export type MergeFieldChoice = 'primary' | 'secondary';

export type MergeChoices = Partial<
  Record<
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'phoneE164'
    | 'jobTitle'
    | 'companyId'
    | 'ownerId'
    | 'lifecycle'
    | 'source',
    MergeFieldChoice
  >
>;

export type MergeContactSnapshot = ContactNameFields & {
  id: string;
  jobTitle: string | null;
  companyId: string | null;
  ownerId: string;
  lifecycle: string;
  source: string | null;
  consent: ChannelConsent[];
};

export type MergeContactsResult = {
  merged: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneE164: string | null;
    jobTitle: string | null;
    companyId: string | null;
    ownerId: string;
    lifecycle: string;
    source: string | null;
    displayName: string;
  };
  consent: ChannelConsent[];
  relatedRecordsToMove: {
    opportunities: string[];
    notes: string[];
    tasks: string[];
  };
};

function pickField<T>(
  field: keyof MergeChoices,
  choices: MergeChoices,
  primary: T,
  secondary: T,
): T {
  return choices[field] === 'secondary' ? secondary : primary;
}

function mergeMarketingConsent(
  a: MarketingConsentState,
  b: MarketingConsentState,
): MarketingConsentState {
  if (a === 'denied' || b === 'denied') return 'denied';
  if (a === 'granted' || b === 'granted') return 'granted';
  return 'unknown';
}

function mergeChannelConsent(
  channels: ConsentChannel[],
  primary: ChannelConsent[],
  secondary: ChannelConsent[],
): ChannelConsent[] {
  const primaryMap = new Map(primary.map((row) => [row.channel, row]));
  const secondaryMap = new Map(secondary.map((row) => [row.channel, row]));

  return channels.map((channel) => {
    const a = primaryMap.get(channel) ?? {
      channel,
      dnd: false,
      marketingConsent: 'unknown' as const,
    };
    const b = secondaryMap.get(channel) ?? {
      channel,
      dnd: false,
      marketingConsent: 'unknown' as const,
    };
    return {
      channel,
      dnd: a.dnd || b.dnd,
      marketingConsent: mergeMarketingConsent(a.marketingConsent, b.marketingConsent),
    };
  });
}

const ALL_CHANNELS: ConsentChannel[] = ['email', 'sms', 'whatsapp', 'call'];

export function mergeContacts(
  primary: MergeContactSnapshot,
  secondary: MergeContactSnapshot,
  choices: MergeChoices,
  related: { opportunityIds: string[]; noteIds: string[]; taskIds: string[] },
): MergeContactsResult {
  const mergedFields = {
    firstName: pickField('firstName', choices, primary.firstName, secondary.firstName),
    lastName: pickField('lastName', choices, primary.lastName, secondary.lastName),
    email: pickField('email', choices, primary.email, secondary.email),
    phoneE164: pickField('phoneE164', choices, primary.phoneE164, secondary.phoneE164),
    jobTitle: pickField('jobTitle', choices, primary.jobTitle, secondary.jobTitle),
    companyId: pickField('companyId', choices, primary.companyId, secondary.companyId),
    ownerId: pickField('ownerId', choices, primary.ownerId, secondary.ownerId),
    lifecycle: pickField('lifecycle', choices, primary.lifecycle, secondary.lifecycle),
    source: pickField('source', choices, primary.source, secondary.source),
  };

  return {
    merged: {
      ...mergedFields,
      displayName: displayName(mergedFields),
    },
    consent: mergeChannelConsent(ALL_CHANNELS, primary.consent, secondary.consent),
    relatedRecordsToMove: {
      opportunities: related.opportunityIds,
      notes: related.noteIds,
      tasks: related.taskIds,
    },
  };
}
