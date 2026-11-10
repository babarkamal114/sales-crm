import type { ChannelKind } from '@/channels/types';

export type SpendSummary = {
  monthlyLimitPence: number;
  spentPence: number;
  percentUsed: number;
  paused: boolean;
  alertAtPercent: number;
  alertTriggered: boolean;
};

export type UsageByChannel = {
  channel: ChannelKind;
  spentPence: number;
  quantity: number;
};

export type UsageOverview = {
  spend: SpendSummary;
  byChannel: UsageByChannel[];
};
