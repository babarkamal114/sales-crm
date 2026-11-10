import 'server-only';

import { randomBytes } from 'node:crypto';
import { decryptSecret, encryptSecret } from '@/server/integrations/token-vault';

export type EncryptedCredentialBlob = {
  credentialsCiphertext: string;
  credentialsKeyId: string;
  credentialsLast4: string;
};

/** Envelope-style record: data key wrapped by app master (vault) until KMS key id is wired. */
export function encryptCredentials(plaintext: string, keyId = 'vault-v1'): EncryptedCredentialBlob {
  const trimmed = plaintext.trim();
  return {
    credentialsCiphertext: encryptSecret(trimmed),
    credentialsKeyId: keyId,
    credentialsLast4: trimmed.slice(-4).padStart(4, '*'),
  };
}

export function decryptCredentials(blob: EncryptedCredentialBlob): string | null {
  return decryptSecret(blob.credentialsCiphertext);
}

export function generateWebhookSecret(): string {
  return randomBytes(32).toString('base64url');
}
