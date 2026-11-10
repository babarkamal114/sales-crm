import type { ContactListQuery } from '@/domain/contacts/list-query';

export function buildContactsSearchParams(
  query: ContactListQuery,
  extra?: { cursor?: string; limit?: number; scenario?: string },
): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.list !== 'all') params.set('list', query.list);
  if (query.owner !== 'all') params.set('owner', query.owner);
  if (query.lifecycle) params.set('lifecycle', query.lifecycle);
  if (query.tagId) params.set('tagId', query.tagId);
  if (query.source) params.set('source', query.source);
  if (query.sort) params.set('sort', query.sort);
  if (query.dir) params.set('dir', query.dir);
  if (extra?.cursor !== undefined) params.set('cursor', extra.cursor);
  if (extra?.limit !== undefined) params.set('limit', String(extra.limit));
  if (extra?.scenario) params.set('scenario', extra.scenario);
  return params;
}
