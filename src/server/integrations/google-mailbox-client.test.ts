import { describe, expect, it } from 'vitest';
import { extractEmailAddress } from '@/server/integrations/google-mailbox-client';

describe('extractEmailAddress', () => {
  it('parses angle-bracket form', () => {
    expect(extractEmailAddress('Jane Doe <jane@example.com>')).toBe('jane@example.com');
  });

  it('returns bare email', () => {
    expect(extractEmailAddress('bob@corp.co.uk')).toBe('bob@corp.co.uk');
  });
});
