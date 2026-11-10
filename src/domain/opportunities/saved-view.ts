import { z } from 'zod';

/** Stored in `saved_view.filters` — mirrors URL search params (no pipeline/view/deal). */
export const savedViewFiltersSchema = z
  .object({
    q: z.string().max(200).optional(),
    owner: z.enum(['me', 'unassigned', 'all']).optional(),
    status: z.enum(['open', 'won', 'lost', 'all']).optional(),
    sort: z.enum(['manual', 'last_activity', 'value', 'created']).optional(),
    listSort: z.enum(['last_activity', 'value', 'created', 'name', 'stage']).optional(),
    listDir: z.enum(['asc', 'desc']).optional(),
    close: z.enum(['all', '30d', '90d', 'month']).optional(),
  })
  .strict();

export type SavedViewFilters = z.infer<typeof savedViewFiltersSchema>;

export const createSavedViewSchema = z.object({
  name: z.string().trim().min(1).max(80),
  scope: z.enum(['board', 'list']),
  pipelineId: z.string().uuid(),
  filters: savedViewFiltersSchema,
  /** Org-wide view (admin/manager only). Stored with `owner_id` null. */
  shared: z.boolean().optional(),
});

export type CreateSavedViewInput = z.infer<typeof createSavedViewSchema>;

export type SavedViewListItem = {
  id: string;
  name: string;
  scope: 'board' | 'list';
  pipelineId: string;
  filters: SavedViewFilters;
  isMine: boolean;
  isShared: boolean;
  canDelete: boolean;
};

export function filtersToSearchParams(filters: SavedViewFilters): Record<string, string | null> {
  return {
    q: filters.q ?? null,
    owner: filters.owner && filters.owner !== 'all' ? filters.owner : null,
    status: filters.status && filters.status !== 'open' ? filters.status : null,
    sort: filters.sort && filters.sort !== 'manual' ? filters.sort : null,
    listSort: filters.listSort && filters.listSort !== 'last_activity' ? filters.listSort : null,
    listDir: filters.listDir && filters.listDir !== 'desc' ? filters.listDir : null,
    close: filters.close && filters.close !== 'all' ? filters.close : null,
  };
}

export function captureFiltersFromUrl(searchParams: URLSearchParams): SavedViewFilters {
  const parsed = savedViewFiltersSchema.safeParse({
    q: searchParams.get('q') || undefined,
    owner: searchParams.get('owner') || undefined,
    status: searchParams.get('status') || undefined,
    sort: searchParams.get('sort') || undefined,
    listSort: searchParams.get('listSort') || undefined,
    listDir: searchParams.get('listDir') || undefined,
    close: searchParams.get('close') || undefined,
  });
  return parsed.success ? parsed.data : {};
}
