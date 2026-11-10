import { describe, expect, it } from 'vitest';
import { updateOpportunitySchema } from '@/domain/opportunities/schemas';

describe('updateOpportunitySchema', () => {
  const base = {
    opportunityId: '11111111-1111-4111-8111-111111111111',
    version: 1,
  };

  it('requires at least one field to update', () => {
    expect(updateOpportunitySchema.safeParse(base).success).toBe(false);
  });

  it('accepts name change', () => {
    const parsed = updateOpportunitySchema.safeParse({ ...base, name: 'New deal' });
    expect(parsed.success).toBe(true);
  });

  it('accepts clearing value and close date', () => {
    const parsed = updateOpportunitySchema.safeParse({
      ...base,
      valuePence: null,
      expectedCloseDate: null,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid close date format', () => {
    expect(
      updateOpportunitySchema.safeParse({
        ...base,
        expectedCloseDate: '13/10/2026',
      }).success,
    ).toBe(false);
  });
});
