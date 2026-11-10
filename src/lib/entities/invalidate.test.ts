import { describe, expect, it, vi } from 'vitest';
import { applyAffected } from '@/lib/entities/invalidate';
import type { QueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query-keys';

function mockClient() {
  const calls: { queryKey: readonly unknown[] }[] = [];
  const queryClient = {
    invalidateQueries: vi.fn((opts: { queryKey: readonly unknown[] }) => {
      calls.push(opts);
      return Promise.resolve();
    }),
  } as unknown as QueryClient;
  return { queryClient, calls };
}

describe('applyAffected', () => {
  it('invalidates opportunity board and dashboard', () => {
    const { queryClient, calls } = mockClient();
    applyAffected(queryClient, [{ type: 'opportunity', id: 'o1' }]);
    expect(calls.some((c) => c.queryKey[0] === qk.opportunities.all[0])).toBe(true);
    expect(calls.some((c) => c.queryKey[0] === qk.dashboard.all[0])).toBe(true);
  });

  it('invalidates contact list and detail keys', () => {
    const { queryClient, calls } = mockClient();
    applyAffected(queryClient, [{ type: 'contact', id: 'c1' }]);
    expect(calls.some((c) => c.queryKey[0] === 'contacts')).toBe(true);
    expect(calls.some((c) => c.queryKey.join(':') === ['contact-quick', 'c1'].join(':'))).toBe(
      true,
    );
  });

  it('dedupes duplicate refs', () => {
    const { queryClient, calls } = mockClient();
    applyAffected(queryClient, [
      { type: 'company', id: 'x' },
      { type: 'company', id: 'x' },
    ]);
    expect(calls.filter((c) => c.queryKey[0] === 'companies' && c.queryKey.length === 1).length).toBe(
      1,
    );
    expect(calls.length).toBe(5);
  });
});
