import { describe, expect, it } from 'vitest';
import {
  buildLeadImportTemplateCsv,
  parseLeadImportCsv,
  parseCsvRows,
} from '@/domain/leads/lead-import-csv';

describe('parseCsvRows', () => {
  it('parses quoted fields with commas', () => {
    expect(parseCsvRows('"Acme, Ltd",Jane\n')).toEqual([['Acme, Ltd', 'Jane']]);
  });
});

describe('parseLeadImportCsv', () => {
  it('accepts a valid template-shaped file', () => {
    const text = buildLeadImportTemplateCsv();
    const result = parseLeadImportCsv(text);
    expect(result.fileErrors).toEqual([]);
    expect(result.rowErrors).toEqual([]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]?.payload.displayName).toBe('Jane Doe');
    expect(result.rows[0]?.payload.valuePence).toBe(500000);
    expect(result.rows[0]?.payload.marketingConsent).toBe(true);
  });

  it('reports missing required headers', () => {
    const result = parseLeadImportCsv('email,phone_e164\na@b.com,+1\n');
    expect(result.fileErrors[0]).toMatch(/Missing required column/);
    expect(result.rows).toHaveLength(0);
  });

  it('reports invalid email on a data row', () => {
    const result = parseLeadImportCsv(
      'contact_name,opportunity_title,email\nJane,Deal,not-an-email\n',
    );
    expect(result.rows).toHaveLength(0);
    expect(result.rowErrors[0]?.lineNumber).toBe(2);
    expect(result.rowErrors[0]?.message).toMatch(/email/i);
  });

  it('rejects invalid marketing_consent', () => {
    const result = parseLeadImportCsv(
      'contact_name,opportunity_title,marketing_consent\nJane,Deal,maybe\n',
    );
    expect(result.rowErrors[0]?.message).toMatch(/marketing_consent/);
  });
});
