import type { ChannelErrorCode } from '@/channels/types';

/** Maps a provider-specific code (lowercase) to our normalised code. */
export type ProviderErrorMapping = Record<string, ChannelErrorCode>;

const TWILIO_ERROR_MAP: ProviderErrorMapping = {
  '21211': 'invalid_recipient',
  '21610': 'recipient_opted_out',
  '21614': 'not_verified',
  '20429': 'rate_limited',
  '20003': 'auth_failed',
  '21606': 'content_rejected',
};

const META_ERROR_MAP: ProviderErrorMapping = {
  '131026': 'recipient_opted_out',
  '131047': 'rate_limited',
  '190': 'auth_failed',
  '368': 'content_rejected',
};

export function mapProviderError(
  provider: 'twilio' | 'meta' | 'google' | 'microsoft' | 'generic',
  providerCode: string | undefined,
  fallbackMessage: string,
): { code: ChannelErrorCode; message: string; retryable: boolean } {
  const normalised = (providerCode ?? '').trim();
  const table =
    provider === 'twilio'
      ? TWILIO_ERROR_MAP
      : provider === 'meta'
        ? META_ERROR_MAP
        : ({} as ProviderErrorMapping);

  const code = table[normalised] ?? 'unknown';
  const retryable =
    code === 'rate_limited' || code === 'provider_unavailable' || code === 'unknown';

  return { code, message: fallbackMessage, retryable };
}

export function isRetryableCode(code: ChannelErrorCode): boolean {
  return code === 'rate_limited' || code === 'provider_unavailable' || code === 'unknown';
}
