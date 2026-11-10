import { z } from 'zod';

export const companyListSortFields = ['name', 'contacts', 'deals', 'won', 'activity', 'created'] as const;

export const companyBuiltinLists = [
  'all',
  'mine',
  'customers',
  'open_deals',
  'stale',
] as const;

export const companyListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  list: z.enum(companyBuiltinLists).optional().default('all'),
  sort: z.enum(companyListSortFields).optional().default('name'),
  dir: z.enum(['asc', 'desc']).optional().default('asc'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export type CompanyListQuery = z.infer<typeof companyListQuerySchema>;

export function parseCompanyListQuery(searchParams: URLSearchParams) {
  return companyListQuerySchema.safeParse({
    q: searchParams.get('q') || undefined,
    list: searchParams.get('list') || undefined,
    sort: searchParams.get('sort') || undefined,
    dir: searchParams.get('dir') || undefined,
    cursor: searchParams.get('cursor') || undefined,
    limit: searchParams.get('limit') || undefined,
  });
}
