import type { QueryClient } from '@tanstack/react-query';
import type { EntityRef } from '@/lib/entities/types';
import { qk } from '@/lib/query-keys';

/** Maps server `affected` refs to React Query invalidations (rule 08). */
export function applyAffected(queryClient: QueryClient, affected: EntityRef[]): void {
  const seen = new Set<string>();

  for (const ref of affected) {
    const key = `${ref.type}:${ref.id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    switch (ref.type) {
      case 'opportunity':
        void queryClient.invalidateQueries({ queryKey: qk.opportunities.all });
        void queryClient.invalidateQueries({ queryKey: qk.dashboard.all });
        break;
      case 'contact':
        void queryClient.invalidateQueries({ queryKey: qk.contacts.all });
        void queryClient.invalidateQueries({ queryKey: qk.contacts.quick(ref.id) });
        void queryClient.invalidateQueries({ queryKey: qk.contacts.profile(ref.id) });
        void queryClient.invalidateQueries({ queryKey: qk.activity.contact(ref.id) });
        break;
      case 'company':
        void queryClient.invalidateQueries({ queryKey: qk.companies.all });
        void queryClient.invalidateQueries({ queryKey: qk.companies.quick(ref.id) });
        void queryClient.invalidateQueries({ queryKey: qk.companies.detail(ref.id) });
        void queryClient.invalidateQueries({ queryKey: qk.companies.stats(ref.id) });
        void queryClient.invalidateQueries({ queryKey: qk.activity.feed(ref) });
        break;
      default:
        break;
    }
  }
}
