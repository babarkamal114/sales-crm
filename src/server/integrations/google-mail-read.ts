import 'server-only';

import { and, eq } from 'drizzle-orm';
import { integrationConnection } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';
import { refreshGoogleMailAccessToken } from '@/server/integrations/google-mail-token';
import { decryptSecret, encryptSecret } from '@/server/integrations/token-vault';

type GoogleMailMetadata = {
  email?: string;
  accessTokenEnc?: string;
  refreshTokenEnc?: string;
  accessTokenExpiresAt?: string;
};

function tokenStillValid(metadata: GoogleMailMetadata): boolean {
  if (!metadata.accessTokenExpiresAt) return true;
  const expires = Date.parse(metadata.accessTokenExpiresAt);
  if (Number.isNaN(expires)) return true;
  return expires > Date.now() + 60_000;
}

async function persistTokens(
  tx: DbTransaction,
  orgId: string,
  metadata: GoogleMailMetadata,
  accessToken: string,
  expiresIn?: number,
) {
  const nextMeta: GoogleMailMetadata = {
    ...metadata,
    accessTokenEnc: encryptSecret(accessToken),
    ...(expiresIn
      ? { accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() }
      : {}),
  };

  await tx
    .update(integrationConnection)
    .set({
      metadata: nextMeta,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(integrationConnection.orgId, orgId),
        eq(integrationConnection.provider, 'google_mail'),
      ),
    );
}

async function resolveAccessToken(
  tx: DbTransaction,
  orgId: string,
  metadata: GoogleMailMetadata,
): Promise<string | null> {
  const accessEnc = metadata.accessTokenEnc;
  if (accessEnc && tokenStillValid(metadata)) {
    const access = decryptSecret(accessEnc);
    if (access) return access;
  }

  const refreshEnc = metadata.refreshTokenEnc;
  if (!refreshEnc) {
    return accessEnc ? decryptSecret(accessEnc) : null;
  }

  const refreshToken = decryptSecret(refreshEnc);
  if (!refreshToken) return null;

  try {
    const refreshed = await refreshGoogleMailAccessToken(refreshToken);
    await persistTokens(tx, orgId, metadata, refreshed.accessToken, refreshed.expiresIn);
    return refreshed.accessToken;
  } catch {
    return null;
  }
}

async function gmailFetch(accessToken: string, path: string): Promise<Response> {
  return fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(20_000),
  });
}

export async function fetchGmailMessageThreadId(
  tx: DbTransaction,
  orgId: string,
  messageId: string,
): Promise<string | null> {
  const [row] = await tx
    .select()
    .from(integrationConnection)
    .where(
      and(
        eq(integrationConnection.orgId, orgId),
        eq(integrationConnection.provider, 'google_mail'),
        eq(integrationConnection.status, 'connected'),
      ),
    )
    .limit(1);

  if (!row) return null;

  const metadata = (row.metadata ?? {}) as GoogleMailMetadata;
  const accessToken = await resolveAccessToken(tx, orgId, metadata);
  if (!accessToken) return null;

  const response = await gmailFetch(
    accessToken,
    `/messages/${encodeURIComponent(messageId)}?format=metadata`,
  );
  if (!response.ok) return null;

  const payload = (await response.json().catch(() => null)) as { threadId?: string } | null;
  return payload?.threadId ?? null;
}

export type GmailInboundMessage = {
  id: string;
  threadId: string;
  internalDateMs: number;
  from: string;
  subject: string;
  snippet: string;
};

export async function listGmailInboundFromAddress(
  tx: DbTransaction,
  orgId: string,
  input: { fromAddress: string; afterMs: number; maxResults?: number },
): Promise<
  | { ok: true; messages: GmailInboundMessage[]; connectedEmail: string }
  | { ok: false; reason: 'google_not_connected' | 'google_token_invalid' }
> {
  const [row] = await tx
    .select()
    .from(integrationConnection)
    .where(
      and(
        eq(integrationConnection.orgId, orgId),
        eq(integrationConnection.provider, 'google_mail'),
        eq(integrationConnection.status, 'connected'),
      ),
    )
    .limit(1);

  if (!row) {
    return { ok: false, reason: 'google_not_connected' };
  }

  const metadata = (row.metadata ?? {}) as GoogleMailMetadata;
  const connectedEmail =
    row.externalAccountId?.trim() || metadata.email?.trim() || '';

  let accessToken = await resolveAccessToken(tx, orgId, metadata);
  if (!accessToken) {
    return { ok: false, reason: 'google_token_invalid' };
  }

  const afterSec = Math.floor(input.afterMs / 1000);
  const q = `from:${input.fromAddress.trim()} after:${afterSec}`;
  const listPath = `/messages?q=${encodeURIComponent(q)}&maxResults=${input.maxResults ?? 8}`;

  let listResponse = await gmailFetch(accessToken, listPath);
  if (listResponse.status === 401 && metadata.refreshTokenEnc) {
    const refreshToken = decryptSecret(metadata.refreshTokenEnc);
    if (refreshToken) {
      try {
        const refreshed = await refreshGoogleMailAccessToken(refreshToken);
        await persistTokens(tx, orgId, metadata, refreshed.accessToken, refreshed.expiresIn);
        accessToken = refreshed.accessToken;
        listResponse = await gmailFetch(accessToken, listPath);
      } catch {
        return { ok: false, reason: 'google_token_invalid' };
      }
    }
  }

  if (!listResponse.ok) {
    return { ok: false, reason: 'google_token_invalid' };
  }

  const listPayload = (await listResponse.json().catch(() => null)) as {
    messages?: { id: string; threadId: string }[];
  } | null;

  const ids = listPayload?.messages ?? [];
  const messages: GmailInboundMessage[] = [];

  for (const item of ids) {
    const detailResponse = await gmailFetch(
      accessToken,
      `/messages/${encodeURIComponent(item.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
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
    const subject =
      headers.find((h) => h.name.toLowerCase() === 'subject')?.value?.trim() ?? '';

    const internalDateMs = detail.internalDate ? Number(detail.internalDate) : 0;
    if (internalDateMs <= input.afterMs) continue;

    if (connectedEmail && from.toLowerCase().includes(connectedEmail.toLowerCase())) {
      continue;
    }

    messages.push({
      id: detail.id,
      threadId: detail.threadId ?? item.threadId,
      internalDateMs,
      from,
      subject,
      snippet: detail.snippet?.trim() ?? '',
    });
  }

  messages.sort((a, b) => b.internalDateMs - a.internalDateMs);
  return { ok: true, messages, connectedEmail };
}
