import { describe, expect, it } from 'vitest';
import { affectedFromContactCreate, refsForOpportunityChange } from '@/lib/entities/affected';

describe('affectedFromContactCreate', () => {
  it('includes contact, company and opportunity when present', () => {
    const refs = affectedFromContactCreate({
      id: 'c1',
      companyId: 'co1',
      opportunityId: 'o1',
    });
    expect(refs).toHaveLength(3);
    expect(refs.map((r) => r.type).sort()).toEqual(['company', 'contact', 'opportunity']);
  });

  it('dedupes company ref', () => {
    const refs = affectedFromContactCreate({ id: 'c1', companyId: null });
    expect(refs).toEqual([{ type: 'contact', id: 'c1' }]);
  });
});

describe('refsForOpportunityChange', () => {
  it('includes company when set', () => {
    const refs = refsForOpportunityChange({
      opportunityId: 'o1',
      contactId: 'c1',
      companyId: 'co1',
    });
    expect(refs.some((r) => r.type === 'company' && r.id === 'co1')).toBe(true);
  });
});
