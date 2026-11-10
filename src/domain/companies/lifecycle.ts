export type CompanyLifecycle = 'prospect' | 'customer' | 'former_customer' | 'not_a_fit';
export type CompanyLifecycleSource = 'derived' | 'manual';

export type DealLifecycleSignal = {
  status: 'open' | 'won' | 'lost' | 'cancelled';
};

export function deriveLifecycle(
  deals: DealLifecycleSignal[],
  current: CompanyLifecycle,
  lifecycleSource: CompanyLifecycleSource,
): CompanyLifecycle {
  if (lifecycleSource === 'manual') {
    return current;
  }

  const hasWon = deals.some((d) => d.status === 'won');
  if (hasWon) {
    return 'customer';
  }

  const allLostOrCancelled =
    deals.length > 0 &&
    deals.every((d) => d.status === 'lost' || d.status === 'cancelled');

  if (current === 'customer' && allLostOrCancelled) {
    return 'former_customer';
  }

  if (current === 'former_customer') {
    return 'former_customer';
  }

  return 'prospect';
}
