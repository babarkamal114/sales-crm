import { z } from 'zod';

export const boardSortSchema = z.enum(['manual', 'last_activity', 'value', 'created']);

export const boardFiltersSchema = z.object({
  q: z.string().trim().max(200).optional(),
  owner: z.enum(['me', 'unassigned', 'all']).optional().default('all'),
  status: z.enum(['open', 'won', 'lost', 'all']).optional().default('open'),
  sort: boardSortSchema.optional().default('manual'),
});

export type BoardFilters = z.infer<typeof boardFiltersSchema>;

export function parseBoardFilters(
  searchParams: URLSearchParams,
): { success: true; data: BoardFilters } | { success: false } {
  const parsed = boardFiltersSchema.safeParse({
    q: searchParams.get('q') || undefined,
    owner: searchParams.get('owner') || undefined,
    status: searchParams.get('status') || undefined,
    sort: searchParams.get('sort') || undefined,
  });
  if (!parsed.success) return { success: false };
  return { success: true, data: parsed.data };
}

export function boardFiltersActive(filters: BoardFilters): boolean {
  return Boolean(
    filters.q?.trim() ||
      (filters.owner && filters.owner !== 'all') ||
      (filters.status && filters.status !== 'open'),
  );
}
