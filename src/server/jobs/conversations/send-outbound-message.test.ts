import { describe, expect, it } from 'vitest';
import { createFakeMessagingProvider } from '@/server/integrations/messaging/fake-provider';

describe('fake messaging provider', () => {
  it('returns provider id on success', async () => {
    const provider = createFakeMessagingProvider();
    const result = await provider.send({
      orgId: '00000000-0000-4000-8000-000000000001',
      messageId: '00000000-0000-4000-8000-000000000002',
      channel: 'sms',
      to: '+447700900000',
      bodyText: 'Hello',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.providerMessageId).toMatch(/^fake_/);
  });

  it('marks permanent failure hook', async () => {
    const provider = createFakeMessagingProvider();
    const result = await provider.send({
      orgId: '00000000-0000-4000-8000-000000000001',
      messageId: '00000000-0000-4000-8000-000000000002',
      channel: 'sms',
      to: '+447700900000',
      bodyText: '__FAIL_PERMANENT__',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryable).toBe(false);
  });
});
