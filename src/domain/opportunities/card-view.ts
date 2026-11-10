import type { OpportunityStatus } from '@/domain/opportunities/types';

export type OpportunityCardView = {
  id: string;
  name: string;
  contactId: string;
  contactName: string;
  companyId: string | null;
  companyName: string | null;
  valuePence: number | null;
  currency: string;
  owner: {
    id: string;
    initials: string;
    colour: string;
  };
  source: string | null;
  status: OpportunityStatus;
  wonAt: string | null;
  lostAt: string | null;
  lostReasonName: string | null;
  daysInStage: number;
  isRotting: boolean;
  nextTask: {
    dueAt: string;
    overdue: boolean;
  } | null;
  openTaskCount: number;
  noteCount: number;
  unreadMessages: boolean;
  contactDndCall: boolean;
  contactDndMessage: boolean;
  version: number;
  position: string;
};

export type BoardStageSummary = {
  stageId: string;
  count: number;
  totalValuePence: number;
  weightedValuePence: number;
};

export type PipelineListItem = {
  id: string;
  name: string;
  isDefault: boolean;
  openDealCount: number;
};

export type PipelineStageView = {
  id: string;
  name: string;
  kind: 'open' | 'won' | 'lost';
  position: number;
  probability: number | null;
};
