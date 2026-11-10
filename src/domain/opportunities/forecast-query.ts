import { z } from 'zod';

export const forecastCloseWindowSchema = z.enum(['all', '30d', '90d', 'month']);

export const forecastQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  owner: z.enum(['me', 'unassigned', 'all']).optional().default('all'),
  close: forecastCloseWindowSchema.optional().default('all'),
});

export type ForecastQuery = z.infer<typeof forecastQuerySchema>;

export function parseForecastQuery(
  searchParams: URLSearchParams,
): { success: true; data: ForecastQuery } | { success: false } {
  const parsed = forecastQuerySchema.safeParse({
    q: searchParams.get('q') || undefined,
    owner: searchParams.get('owner') || undefined,
    close: searchParams.get('close') || undefined,
  });
  if (!parsed.success) return { success: false };
  return { success: true, data: parsed.data };
}

export function forecastQueryActive(query: ForecastQuery): boolean {
  return Boolean(query.q?.trim() || (query.owner && query.owner !== 'all') || query.close !== 'all');
}

export function closeWindowLabel(close: ForecastQuery['close']): string {
  switch (close) {
    case '30d':
      return 'Next 30 days';
    case '90d':
      return 'Next 90 days';
    case 'month':
      return 'This month';
    default:
      return 'All open deals';
  }
}
