import 'server-only';

type OrgListener = (payload: string) => void;

declare global {
  // eslint-disable-next-line no-var
  var __crmOrgRealtimeBus: Map<string, Set<OrgListener>> | undefined;
}

function bus(): Map<string, Set<OrgListener>> {
  if (!globalThis.__crmOrgRealtimeBus) {
    globalThis.__crmOrgRealtimeBus = new Map();
  }
  return globalThis.__crmOrgRealtimeBus;
}

export function subscribeOrgBus(orgId: string, listener: OrgListener): () => void {
  const map = bus();
  let set = map.get(orgId);
  if (!set) {
    set = new Set();
    map.set(orgId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) map.delete(orgId);
  };
}

export function publishOrgBus(orgId: string, payload: string): void {
  const set = bus().get(orgId);
  if (!set) return;
  for (const listener of set) {
    listener(payload);
  }
}
