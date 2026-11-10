import type { BoardFilters } from '@/domain/opportunities/filters';
import type { OpportunityListQuery } from '@/domain/opportunities/list-query';
import type { ContactListQuery } from '@/domain/contacts/list-query';
import type { CompanyListQuery } from '@/domain/companies/list-query';
import type { EntityRef } from '@/lib/entities/types';

/** Shared React Query key factory for CRM entities. */
export const qk = {
  contacts: {
    all: ['contacts'] as const,
    list: (f: ContactListQuery & { savedListId?: string | null; devScenario?: string | null }) =>
      ['contacts', 'list', f] as const,
    counts: () => ['contacts', 'counts'] as const,
    detail: (id: string) => ['contacts', 'detail', id] as const,
    quick: (id: string) => ['contact-quick', id] as const,
    profile: (id: string) => ['contact-profile', id] as const,
    tab: (id: string, tab: string) => ['contacts', 'detail', id, tab] as const,
  },
  companies: {
    all: ['companies'] as const,
    list: (f: CompanyListQuery) => ['companies', 'list', f] as const,
    counts: () => ['companies', 'counts'] as const,
    detail: (id: string) => ['company', id] as const,
    quick: (id: string) => ['company-quick', id] as const,
    stats: (id: string) => ['companies', 'detail', id, 'stats'] as const,
    tab: (id: string, tab: string) => ['companies', 'detail', id, tab] as const,
  },
  conversations: {
    bootstrap: (conversationId: string | null) =>
      ['conversations', 'bootstrap', conversationId] as const,
  },
  opportunities: {
    all: ['opportunities'] as const,
    pipelines: () => ['opportunities', 'pipelines'] as const,
    boardSummary: (pipelineId: string, filters: BoardFilters) =>
      ['opportunities', 'board-summary', pipelineId, filters] as const,
    stageCards: (pipelineId: string, stageId: string, filters: BoardFilters) =>
      ['opportunities', 'stage-cards', pipelineId, stageId, filters] as const,
    detail: (opportunityId: string, filters?: BoardFilters) =>
      ['opportunities', 'detail', opportunityId, filters ?? {}] as const,
    list: (pipelineId: string, query: OpportunityListQuery) =>
      ['opportunities', 'list', pipelineId, query] as const,
    board: (pipelineId: string, f: BoardFilters) =>
      ['opportunities', 'board', pipelineId, f] as const,
  },
  activity: {
    feed: (ref: EntityRef) => ['activity', ref.type, ref.id] as const,
    contact: (id: string) => ['contact-activity', id] as const,
  },
  dashboard: { all: ['dashboard'] as const },
  search: { global: (q: string) => ['search', q] as const },
};
