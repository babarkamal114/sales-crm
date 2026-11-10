export type ChannelCardState =
  | 'not_set_up'
  | 'in_progress'
  | 'needs_attention'
  | 'suspended'
  | 'active';

export type ChannelOverviewCard = {
  id: 'email' | 'phone_sms' | 'whatsapp' | 'usage';
  title: string;
  state: ChannelCardState;
  mode: 'managed' | 'byo' | 'mailbox' | null;
  providerLabel: string | null;
  identity: string | null;
  statusReason: string | null;
  lastCheckedAt: string | null;
  nextAction: string | null;
  readOnly: boolean;
};

export type ChannelsOverview = {
  cards: ChannelOverviewCard[];
};
