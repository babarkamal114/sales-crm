import { describe, expect, it } from 'vitest';
import {
  captureFiltersFromUrl,
  createSavedViewSchema,
  filtersToSearchParams,
  savedViewFiltersSchema,
} from '@/domain/opportunities/saved-view';

describe('createSavedViewSchema', () => {
  it('accepts optional shared flag', () => {
    const parsed = createSavedViewSchema.parse({
      name: 'My view',
      scope: 'board',
      pipelineId: '550e8400-e29b-41d4-a716-446655440000',
      filters: {},
      shared: true,
    });
    expect(parsed.shared).toBe(true);
  });
});

describe('savedViewFiltersSchema', () => {
  it('accepts board and list filter fields', () => {
    const parsed = savedViewFiltersSchema.parse({
      q: 'acme',
      owner: 'me',
      status: 'open',
      sort: 'manual',
      listSort: 'value',
      listDir: 'asc',
      close: '30d',
    });
    expect(parsed.q).toBe('acme');
  });

  it('rejects unknown keys', () => {
    expect(() => savedViewFiltersSchema.parse({ foo: 'bar' })).toThrow();
  });
});

describe('filtersToSearchParams', () => {
  it('omits default values from URL patch', () => {
    expect(filtersToSearchParams({ owner: 'all', status: 'open' })).toEqual({
      q: null,
      owner: null,
      status: null,
      sort: null,
      listSort: null,
      listDir: null,
      close: null,
    });
  });

  it('maps non-default filters', () => {
    expect(
      filtersToSearchParams({ q: 'x', owner: 'me', listSort: 'stage', listDir: 'asc' }),
    ).toMatchObject({
      q: 'x',
      owner: 'me',
      listSort: 'stage',
      listDir: 'asc',
    });
  });
});

describe('captureFiltersFromUrl', () => {
  it('reads search params', () => {
    const params = new URLSearchParams('q=hello&owner=me&listSort=value');
    expect(captureFiltersFromUrl(params)).toEqual({
      q: 'hello',
      owner: 'me',
      listSort: 'value',
    });
  });
});
