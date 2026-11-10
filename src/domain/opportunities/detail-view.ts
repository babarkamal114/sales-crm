import type { OpportunityStatus } from '@/domain/opportunities/types';

export type OpportunityActivityItem = {
  id: string;
  type: 'stage_change';
  movedAt: string;
  fromStageName: string | null;
  toStageName: string;
  movedByName: string;
  timeInPreviousStageSeconds: number | null;
};

export type OpportunityNoteView = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    fullName: string;
    initials: string;
  };
};

export type OpportunityTaskView = {
  id: string;
  title: string;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  assignee: { id: string; fullName: string } | null;
  createdBy: { id: string; fullName: string };
};

export type TeamMemberOption = {
  id: string;
  fullName: string;
  initials: string;
};

export type OpportunityDetailView = {
  id: string;
  name: string;
  pipelineId: string;
  pipelineName: string;
  stage: {
    id: string;
    name: string;
    kind: 'open' | 'won' | 'lost';
  };
  status: OpportunityStatus;
  valuePence: number | null;
  currency: string;
  weightedValuePence: number;
  probabilityPercent: number;
  expectedCloseDate: string | null;
  source: string | null;
  campaign: string | null;
  version: number;
  contact: {
    id: string;
    displayName: string;
    email: string | null;
    phoneE164: string | null;
  };
  owner: {
    id: string;
    fullName: string;
    initials: string;
    colour: string;
  };
  wonAt: string | null;
  lostAt: string | null;
  lostReasonName: string | null;
  lostNote: string | null;
  stageEnteredAt: string;
  lastActivityAt: string | null;
  daysInStage: number;
  isRotting: boolean;
  createdAt: string;
  updatedAt: string;
  openTaskCount: number;
  noteCount: number;
  navigation: {
    prevId: string | null;
    nextId: string | null;
    index: number;
    total: number;
  };
  activity: OpportunityActivityItem[];
  notes: OpportunityNoteView[];
  tasks: OpportunityTaskView[];
  teamMembers: TeamMemberOption[];
};
