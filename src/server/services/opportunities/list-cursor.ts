import type { listSortFieldSchema, listSortDirSchema } from '@/domain/opportunities/list-query';
import type { z } from 'zod';

export type ListSortField = z.infer<typeof listSortFieldSchema>;
export type ListSortDir = z.infer<typeof listSortDirSchema>;

export type OpportunityListCursor = {
  field: ListSortField;
  dir: ListSortDir;
  id: string;
  /** Primary sort key (ISO date, number, or string). */
  k1: string | number;
  /** Secondary key for composite sorts (e.g. stage). */
  k2?: string | number;
};

export function encodeListCursor(cursor: OpportunityListCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeListCursor(raw: string | null): OpportunityListCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8'),
    ) as OpportunityListCursor;
    if (typeof parsed.id !== 'string' || typeof parsed.k1 === 'undefined') return null;
    return parsed;
  } catch {
    return null;
  }
}
