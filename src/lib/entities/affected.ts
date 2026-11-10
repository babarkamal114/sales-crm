import type { EntityRef } from '@/lib/entities/types';

export function refsForOpportunityChange(input: {
  opportunityId: string;
  contactId: string;
  companyId: string | null;
  pipelineId?: string;
}): EntityRef[] {
  const refs: EntityRef[] = [
    { type: 'opportunity', id: input.opportunityId },
    { type: 'contact', id: input.contactId },
  ];
  if (input.companyId) {
    refs.push({ type: 'company', id: input.companyId });
  }
  return refs;
}

export function affectedFromContactCreate(result: {
  id: string;
  companyId: string | null;
  opportunityId?: string | null;
}): EntityRef[] {
  const refs: EntityRef[] = [{ type: 'contact', id: result.id }];
  if (result.companyId) refs.push({ type: 'company', id: result.companyId });
  if (result.opportunityId) refs.push({ type: 'opportunity', id: result.opportunityId });
  return dedupeEntityRefs(refs);
}

export function dedupeEntityRefs(refs: EntityRef[]): EntityRef[] {
  const seen = new Set<string>();
  const out: EntityRef[] = [];
  for (const ref of refs) {
    const key = `${ref.type}:${ref.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ref);
  }
  return out;
}
