import { describe, expect, it } from 'vitest';
import { parseContactsDevScenario } from '@/domain/contacts/dev-scenario';

describe('parseContactsDevScenario', () => {
  it('returns undefined when fixtures are disabled', () => {
    const prev = process.env.APP_ENV;
    process.env.APP_ENV = 'production';
    try {
      expect(
        parseContactsDevScenario(new URLSearchParams('scenario=empty')),
      ).toBeUndefined();
    } finally {
      process.env.APP_ENV = prev;
    }
  });

  it('parses known scenarios in local dev', () => {
    const prev = process.env.APP_ENV;
    process.env.APP_ENV = 'local';
    try {
      expect(parseContactsDevScenario(new URLSearchParams('scenario=empty'))).toBe('empty');
      expect(
        parseContactsDevScenario(new URLSearchParams('scenario=not-real')),
      ).toBeUndefined();
    } finally {
      process.env.APP_ENV = prev;
    }
  });
});
