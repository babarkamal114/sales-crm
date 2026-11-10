import 'server-only';

import { eq } from 'drizzle-orm';
import { mailboxConnection } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';
import { refreshGoogleMailAccessToken } from '@/server/integrations/google-mail-token';
import { decryptSecret, encryptSecret } from '@/server/integrations/token-vault';

export type GmailListedMessage = {
  id: string;
  threadId: string;
  internalDateMs: number;
  from: string;
  to: string;
  subject: string;
  snippet: string;
};

function tokenStillValid(tokenExpiresAt: Date | null): boolean {
  if (!tokenExpiresAt) return true;
  return tokenExpiresAt.getTime() > Date.now() + 60_000;
}

export async function persistGoogleMailboxTokens(
  tx: DbTransaction,
  mailboxId: string,
  userId: string,
  accessToken: string,
  expiresIn?: number,
): Promise<void> {
  await tx
    .update(mailboxConnection)
    .set({
      accessTokenCiphertext: encryptSecret(accessToken),
      ...(expiresIn ? { tokenExpiresAt: new Date(Date.now() + expiresIn * 1000) } : {}),
      updatedAt: new Date(),
      updatedBy: userId,
    })
    .where(eq(mailboxConnection.id, mailboxId));
}

export async function resolveGoogleMailboxAccessToken(
  tx: DbTransaction,
  mailboxId: string,
  userId: string,
  row: {
    accessTokenCiphertext: string | null;
    refreshTokenCiphertext: string | null;
    tokenExpiresAt: Date | null;
  },
): Promise<string | null> {
  const accessEnc = row.accessTokenCiphertext;
  if (accessEnc && tokenStillValid(row.tokenExpiresAt)) {
    const access = decryptSecret(accessEnc);
    if (access) return access;
  }

  const refreshEnc = row.refreshTokenCiphertext;
  if (!refreshEnc) {
    return accessEnc ? decryptSecret(accessEnc) : null;
  }

  const refreshToken = decryptSecret(refreshEnc);
  if (!refreshToken) return null;

  try {
    const refreshed = await refreshGoogleMailAccessToken(refreshToken);
    await persistGoogleMailboxTokens(tx, mailboxId, userId, refreshed.accessToken, refreshed.expiresIn);
    return refreshed.accessToken;
  } catch {
    return null;
  }
}

export async function gmailApiFetch(accessToken: string, path: string): Promise<Response> {
  return fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(25_000),
  });
}

export function extractEmailAddress(headerValue: string): string {
  const angle = headerValue.match(/<([^>]+)>/);
  if (angle?.[1]) return angle[1].trim().toLowerCase();
  const bare = headerValue.trim().toLowerCase();
  if (bare.includes('@')) return bare;
  return '';
}

/** Lists Gmail messages to/from a contact address since `afterMs` (contact-only sync). */
export async function listGmailMessagesForContact(
  accessToken: string,
  input: {
    contactEmail: string;
    mailboxEmail: string;
    afterMs: number;
    maxResults?: number;
  },
): Promise<GmailListedMessage[]> {
  const contact = input.contactEmail.trim().toLowerCase();
  const afterSec = Math.floor(input.afterMs / 1000);
  const q = `(from:${contact} OR to:${contact}) after:${afterSec}`;
  const listPath = `/messages?q=${encodeURIComponent(q)}&maxResults=${input.maxResults ?? 15}`;

  const listResponse = await gmailApiFetch(accessToken, listPath);
  if (!listResponse.ok) return [];

  const listPayload = (await listResponse.json().catch(() => null)) as {
    messages?: { id: string; threadId: string }[];
  } | null;

  const ids = listPayload?.messages ?? [];
  const messages: GmailListedMessage[] = [];

  for (const item of ids) {
    const detailResponse = await gmailApiFetch(
      accessToken,
      `/messages/${encodeURIComponent(item.id)}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject`,
    );
    if (!detailResponse.ok) continue;

    const detail = (await detailResponse.json().catch(() => null)) as {
      id?: string;
      threadId?: string;
      internalDate?: string;
      snippet?: string;
      payload?: { headers?: { name: string; value: string }[] };
    } | null;

    if (!detail?.id) continue;

    const headers = detail.payload?.headers ?? [];
    const from =
      headers.find((h) => h.name.toLowerCase() === 'from')?.value?.trim() ?? '';
    const to = headers.find((h) => h.name.toLowerCase() === 'to')?.value?.trim() ?? '';
    const subject =
      headers.find((h) => h.name.toLowerCase() === 'subject')?.value?.trim() ?? '';

    const fromEmail = extractEmailAddress(from);
    const toEmail = extractEmailAddress(to);

    const touchesContact =
      fromEmail === contact ||
      toEmail === contact ||
      from.toLowerCase().includes(contact) ||
      to.toLowerCase().includes(contact);
    if (!touchesContact) continue;

    const internalDateMs = detail.internalDate ? Number(detail.internalDate) : 0;
    if (internalDateMs > 0 && internalDateMs <= input.afterMs) continue;

    messages.push({
      id: detail.id,
      threadId: detail.threadId ?? item.threadId,
      internalDateMs,
      from,
      to,
      subject,
      snippet: detail.snippet?.trim() ?? '',
    });
  }

  messages.sort((a, b) => a.internalDateMs - b.internalDateMs);
  return messages;
}
