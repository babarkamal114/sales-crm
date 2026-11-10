import 'server-only';

import { randomUUID } from 'node:crypto';
import type {
  MessagingProvider,
  OutboundMessagePayload,
  ProviderSendResult,
} from '@/server/integrations/messaging/types';

/** Dev/test provider — records sends in memory when needed. */
export function createFakeMessagingProvider(): MessagingProvider {
  return {
    async send(message: OutboundMessagePayload): Promise<ProviderSendResult> {
      if (message.bodyText.includes('__FAIL_PERMANENT__')) {
        return {
          ok: false,
          retryable: false,
          errorCode: 'INVALID',
          errorMessage: 'Permanent failure (test hook).',
        };
      }
      if (message.bodyText.includes('__FAIL_RETRY__')) {
        return {
          ok: false,
          retryable: true,
          errorCode: 'UNAVAILABLE',
          errorMessage: 'Temporary failure (test hook).',
        };
      }
      return {
        ok: true,
        provider: 'fake',
        providerMessageId: `fake_${randomUUID()}`,
      };
    },
  };
}
