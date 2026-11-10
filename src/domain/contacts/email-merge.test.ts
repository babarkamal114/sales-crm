import { describe, expect, it } from 'vitest';
import { buildEmailMergeContext, mergeEmailTemplate } from '@/domain/contacts/email-merge';

describe('mergeEmailTemplate', () => {
  const ctx = buildEmailMergeContext({
    firstName: 'Alex',
    lastName: 'Lee',
    displayName: 'Alex Lee',
    companyName: 'Oakfield FC',
    senderName: 'Sam',
    orgName: 'Devbeam',
  });

  it('replaces known tokens', () => {
    const out = mergeEmailTemplate('Hi {{first_name}} at {{company}} — {{sender_name}}', ctx);
    expect(out).toBe('Hi Alex at Oakfield FC — Sam');
  });

  it('uses fallback company', () => {
    const noCo = buildEmailMergeContext({
      firstName: 'Alex',
      lastName: '',
      displayName: 'Alex',
      companyName: null,
      senderName: 'Sam',
      orgName: 'Devbeam',
    });
    expect(mergeEmailTemplate('{{company}}', noCo)).toBe('your organisation');
  });
});
