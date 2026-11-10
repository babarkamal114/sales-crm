import type { OpportunityStatus } from '@/domain/opportunities/types';

export type OpportunityListRow = {
  id: string;
  name: string;
  contactName: string;
  stageName: string;
  stageKind: 'open' | 'won' | 'lost';
  valuePence: number | null;
  currency: string;
  owner: {
    id: string;
    initials: string;
    colour: string;
    fullName: string;
  };
  status: OpportunityStatus;
  lastActivityAt: string | null;
  createdAt: string;
  daysInStage: number;
  isRotting: boolean;
};
