import 'server-only';

import { and, eq, inArray, sql } from 'drizzle-orm';
import { integrationConnection, mailboxConnection } from '@/server/db/schema';
import type { DbTransaction } from '@/server/db/with-tenant';
import { refreshGoogleMailAccessToken } from '@/server/integrations/google-mail-token';
import { decryptSecret, encryptSecret } from '@/server/integrations/token-vault';

export type GoogleMailSendInput = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

export type GoogleMailSendResult =
  | { ok: true; providerMessageId: string | null; fromEmail: string }
  | {
      ok: false;
      reason:
        | 'google_not_connected'
        | 'google_token_invalid'
        | 'invalid_recipient'
        | 'send_failed'
        | 'no_mailbox'
        | 'mailbox_not_ready'
        | 'microsoft_send_not_available';
      detail?: string;
    };

type GoogleMailMetadata = {
  email?: string;
  accessTokenEnc?: string;
  refreshTokenEnc?: string;
  accessTokenExpiresAt?: string;
};

function encodeGmailRaw(mime: string): string {
  return Buffer.from(mime, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function buildMimeMessage(input: {
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): string {
  const lines = [
    `From: ${input.fromEmail}`,
    `To: ${input.to}`,
    ...(input.replyTo ? [`Reply-To: ${input.replyTo}`] : []),
    `Subject: ${input.subject.replace(/\r?\n/g, ' ')}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    input.html,
  ];
  return `${lines.join('\r\n')}\r\n`;
}

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
    const fallback = accessEnc ? decryptSecret(accessEnc) : null;
    return fallback;
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

export async function gmailSend(accessToken: string, raw: string): Promise<Response> {
  return fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
    signal: AbortSignal.timeout(20_000),
  });
}

async function persistMailboxTokens(
  tx: DbTransaction,
  mailboxId: string,
  userId: string,
  accessToken: string,
  expiresIn?: number,
) {
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

function mailboxTokenStillValid(tokenExpiresAt: Date | null): boolean {
  if (!tokenExpiresAt) return true;
  return tokenExpiresAt.getTime() > Date.now() + 60_000;
}

async function resolveMailboxAccessToken(
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
  if (accessEnc && mailboxTokenStillValid(row.tokenExpiresAt)) {
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
    await persistMailboxTokens(tx, mailboxId, userId, refreshed.accessToken, refreshed.expiresIn);
    return refreshed.accessToken;
  } catch {
    return null;
  }
}

async function sendGmailMime(input: {
    orgId: string;
    fromEmail: string;
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
    accessToken: string;
    refreshTokenEnc?: string | null;
    onRefresh: (accessToken: string, expiresIn?: number) => Promise<void>;
  },
): Promise<GoogleMailSendResult> {
  const mime = buildMimeMessage({
    fromEmail: input.fromEmail,
    to: input.to,
    subject: input.subject,
    html: input.html,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
  });
  const raw = encodeGmailRaw(mime);

  let accessToken = input.accessToken;
  let response = await gmailSend(accessToken, raw);
  if (response.status === 401 && input.refreshTokenEnc) {
    const refreshToken = decryptSecret(input.refreshTokenEnc);
    if (refreshToken) {
      try {
        const refreshed = await refreshGoogleMailAccessToken(refreshToken);
        await input.onRefresh(refreshed.accessToken, refreshed.expiresIn);
        accessToken = refreshed.accessToken;
        response = await gmailSend(accessToken, raw);
      } catch {
        return { ok: false, reason: 'google_token_invalid' };
      }
    }
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => undefined);
    return detail
      ? { ok: false, reason: 'send_failed', detail }
      : { ok: false, reason: 'send_failed' };
  }

  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  return { ok: true, providerMessageId: payload?.id ?? null, fromEmail: input.fromEmail };
}

/** Sends from the user's personal Google mailbox (preferred over org-level integration). */
export async function sendGoogleMailForPersonalMailbox(
  tx: DbTransaction,
  orgId: string,
  userId: string,
  input: GoogleMailSendInput,
): Promise<GoogleMailSendResult> {
  const to = input.to.trim();
  if (!to || !to.includes('@')) {
    return { ok: false, reason: 'invalid_recipient' };
  }

  const [row] = await tx
    .select()
    .from(mailboxConnection)
    .where(
      and(
        eq(mailboxConnection.orgId, orgId),
        eq(mailboxConnection.userId, userId),
        eq(mailboxConnection.kind, 'personal'),
        inArray(mailboxConnection.status, ['active', 'syncing_initial']),
      ),
    )
    .limit(1);

  if (!row) {
    return { ok: false, reason: 'no_mailbox' };
  }

  if (row.provider === 'microsoft') {
    return {
      ok: false,
      reason: 'microsoft_send_not_available',
      detail: 'Sending from Microsoft 365 mailboxes is not available yet.',
    };
  }

  if (row.provider !== 'google') {
    return { ok: false, reason: 'mailbox_not_ready', detail: 'Mailbox provider is not supported for send.' };
  }

  if (row.sentToday >= row.dailySendLimit) {
    return {
      ok: false,
      reason: 'send_failed',
      detail: 'Daily send limit reached for this mailbox. Try again tomorrow or ask an Admin.',
    };
  }

  const fromEmail = row.emailAddress.trim();
  if (!fromEmail) {
    return { ok: false, reason: 'mailbox_not_ready' };
  }

  let accessToken = await resolveMailboxAccessToken(tx, row.id, userId, row);
  if (!accessToken) {
    return { ok: false, reason: 'google_token_invalid' };
  }

  const sent = await sendGmailMime({
    orgId,
    fromEmail,
    to,
    subject: input.subject,
    html: input.html,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    accessToken,
    refreshTokenEnc: row.refreshTokenCiphertext ?? null,
    onRefresh: async (token, expiresIn) => {
      await persistMailboxTokens(tx, row.id, userId, token, expiresIn);
    },
  });

  if (sent.ok) {
    await tx
      .update(mailboxConnection)
      .set({
        sentToday: sql`${mailboxConnection.sentToday} + 1`,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(mailboxConnection.id, row.id));
  }

  return sent;
}

export async function sendGoogleMailForOrg(
  tx: DbTransaction,
  orgId: string,
  input: GoogleMailSendInput,
): Promise<GoogleMailSendResult> {
  const to = input.to.trim();
  if (!to || !to.includes('@')) {
    return { ok: false, reason: 'invalid_recipient' };
  }

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
  const fromEmail = row.externalAccountId?.trim() || metadata.email?.trim();
  if (!fromEmail) {
    return { ok: false, reason: 'google_not_connected' };
  }

  let accessToken = await resolveAccessToken(tx, orgId, metadata);
  if (!accessToken) {
    return { ok: false, reason: 'google_token_invalid' };
  }

  return sendGmailMime({
    orgId,
    fromEmail,
    to,
    subject: input.subject,
    html: input.html,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    accessToken,
    refreshTokenEnc: metadata.refreshTokenEnc ?? null,
    onRefresh: async (token, expiresIn) => {
      await persistTokens(tx, orgId, metadata, token, expiresIn);
    },
  });
}
