import { describe, expect, it } from 'vitest';
import { can } from '@/server/access/capabilities';

describe('capabilities', () => {
  it('grants pipeline settings only to admin', () => {
    expect(can({ role: 'admin' }, 'settings.pipelines.manage')).toBe(true);
    expect(can({ role: 'manager' }, 'settings.pipelines.manage')).toBe(false);
    expect(can({ role: 'member' }, 'settings.pipelines.manage')).toBe(false);
  });

  it('allows managers to move opportunities', () => {
    expect(can({ role: 'manager' }, 'opportunity.move')).toBe(true);
  });
});
