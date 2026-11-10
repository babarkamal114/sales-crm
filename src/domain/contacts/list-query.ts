import { z } from 'zod';

export const contactListSortFields = [
  'name',
  'company',
  'owner',
  'last_activity',
  'created',
  'deal_value',
] as const;

export const contactLifecycleFilter = z.enum([
  'lead',
  'customer',
  'former_customer',
  'not_a_fit',
]);

export const contactListQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  list: z
    .enum(['all', 'mine', 'new_week', 'no_next_step', 'dnd'])
    .optional()
    .default('all'),
  owner: z.enum(['me', 'unassigned', 'all']).optional().default('all'),
  lifecycle: contactLifecycleFilter.optional(),
  tagId: z.string().uuid().optional(),
  source: z.string().trim().max(80).optional(),
  sort: z.enum(contactListSortFields).optional().default('last_activity'),
  dir: z.enum(['asc', 'desc']).optional().default('desc'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export type ContactListQuery = z.infer<typeof contactListQuerySchema>;

export function parseContactListQuery(searchParams: URLSearchParams) {
  return contactListQuerySchema.safeParse({
    q: searchParams.get('q') || undefined,
    list: searchParams.get('list') || undefined,
    owner: searchParams.get('owner') || undefined,
    lifecycle: searchParams.get('lifecycle') || undefined,
    tagId: searchParams.get('tagId') || undefined,
    source: searchParams.get('source') || undefined,
    sort: searchParams.get('sort') || undefined,
    dir: searchParams.get('dir') || undefined,
    cursor: searchParams.get('cursor') || undefined,
    limit: searchParams.get('limit') || undefined,
  });
}
