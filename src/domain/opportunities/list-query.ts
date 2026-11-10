import { z } from 'zod';
import { boardFiltersSchema } from '@/domain/opportunities/filters';

export const listSortFieldSchema = z.enum([
  'last_activity',
  'value',
  'created',
  'name',
  'stage',
]);

export const listSortDirSchema = z.enum(['asc', 'desc']);

export const opportunityListQuerySchema = boardFiltersSchema.extend({
  listSort: listSortFieldSchema.optional().default('last_activity'),
  listDir: listSortDirSchema.optional().default('desc'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export type OpportunityListQuery = z.infer<typeof opportunityListQuerySchema>;

export function parseOpportunityListQuery(
  searchParams: URLSearchParams,
): { success: true; data: OpportunityListQuery } | { success: false } {
  const parsed = opportunityListQuerySchema.safeParse({
    q: searchParams.get('q') || undefined,
    owner: searchParams.get('owner') || undefined,
    status: searchParams.get('status') || undefined,
    sort: searchParams.get('sort') || undefined,
    listSort: searchParams.get('listSort') || undefined,
    listDir: searchParams.get('listDir') || undefined,
    limit: searchParams.get('limit') || undefined,
  });
  if (!parsed.success) return { success: false };
  return { success: true, data: parsed.data };
}

export function listQueryActive(query: OpportunityListQuery): boolean {
  return Boolean(
    query.q?.trim() ||
      (query.owner && query.owner !== 'all') ||
      (query.status && query.status !== 'open'),
  );
}
