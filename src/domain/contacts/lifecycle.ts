export type ContactLifecycle = 'lead' | 'customer' | 'former_customer' | 'not_a_fit';

export type LifecycleEvent =
  | { type: 'opportunity_won' }
  | { type: 'all_opportunities_lost' }
  | { type: 'manual'; lifecycle: ContactLifecycle };

export function lifecycleAfter(
  current: ContactLifecycle,
  event: LifecycleEvent,
): ContactLifecycle {
  if (event.type === 'manual') {
    return event.lifecycle;
  }
  if (event.type === 'opportunity_won') {
    return 'customer';
  }
  if (event.type === 'all_opportunities_lost') {
    return current === 'customer' ? 'former_customer' : 'lead';
  }
  return current;
}
