import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';
import type { ChannelKind } from '@/channels/types';
import type { ChannelBundle } from '@/channels/interfaces';
import type { MailboxProvider } from '@/channels/interfaces';
import {
  createFakeMailboxProvider,
  createFakeNumberProvider,
  createFakeSmsProvider,
  createFakeVoiceProvider,
  createFakeWhatsAppProvider,
} from '@/channels/fake/fake-providers';
import { channelConnection, mailboxConnection } from '@/server/db/schema/channels';
import type { DbTransaction } from '@/server/db/with-tenant';
import { decryptCredentials, type EncryptedCredentialBlob } from '@/channels/credentials';
import { createGoogleMailboxProvider } from '@/channels/google/google-mailbox-provider';

export class ChannelNotConfiguredError extends Error {
  readonly code = 'NOT_CONFIGURED' as const;
  constructor(channel: ChannelKind) {
    super(`No active ${channel} connection for this organisation.`);
    this.name = 'ChannelNotConfiguredError';
  }
}

export class MailboxNotFoundError extends Error {
  readonly code = 'MAILBOX_NOT_FOUND' as const;
  constructor() {
    super('Mailbox not found or not accessible.');
    this.name = 'MailboxNotFoundError';
  }
}

function useFakeProviders(): boolean {
  return process.env.CHANNELS_USE_FAKE === '1' || process.env.NODE_ENV === 'test';
}

function bundleFromRow(row: typeof channelConnection.$inferSelect): ChannelBundle {
  const base = {
    connectionId: row.id,
    orgId: row.orgId,
    mode: row.mode,
    provider: row.provider,
  };

  if (useFakeProviders()) {
    const bundle: ChannelBundle = { ...base };
    if (row.channel === 'sms' || row.channel === 'whatsapp') bundle.sms = createFakeSmsProvider();
    if (row.channel === 'voice') bundle.voice = createFakeVoiceProvider();
    if (row.channel === 'whatsapp') bundle.whatsapp = createFakeWhatsAppProvider();
    if (row.mode === 'managed') bundle.numbers = createFakeNumberProvider();
    return bundle;
  }

  // Real Twilio/Meta adapters are wired in later phases; fail closed in production.
  throw new Error(`Live provider adapter not implemented for ${row.provider}/${row.channel}`);
}

/** Per-request cache: one Map on the transaction object. */
const TX_CACHE = Symbol('channelRegistryCache');

type RegistryCache = {
  channels: Map<string, ChannelBundle>;
  mailboxes: Map<string, MailboxProvider>;
};

function cacheFor(tx: DbTransaction): RegistryCache {
  const ext = tx as DbTransaction & { [TX_CACHE]?: RegistryCache };
  if (!ext[TX_CACHE]) {
    ext[TX_CACHE] = { channels: new Map(), mailboxes: new Map() };
  }
  return ext[TX_CACHE];
}

export async function getChannel(
  tx: DbTransaction,
  orgId: string,
  channel: ChannelKind,
): Promise<ChannelBundle> {
  const cache = cacheFor(tx);
  const cacheKey = `${orgId}:${channel}`;
  const hit = cache.channels.get(cacheKey);
  if (hit) return hit;

  const [row] = await tx
    .select()
    .from(channelConnection)
    .where(
      and(
        eq(channelConnection.orgId, orgId),
        eq(channelConnection.channel, channel),
        eq(channelConnection.isDefault, true),
        eq(channelConnection.status, 'active'),
      ),
    )
    .limit(1);

  if (!row) {
    if (useFakeProviders()) {
      const fake: ChannelBundle = {
        connectionId: '00000000-0000-4000-8000-000000000001',
        orgId,
        mode: 'managed',
        provider: 'twilio',
        numbers: createFakeNumberProvider(),
      };
      if (channel === 'sms') fake.sms = createFakeSmsProvider();
      if (channel === 'voice') fake.voice = createFakeVoiceProvider();
      if (channel === 'whatsapp') fake.whatsapp = createFakeWhatsAppProvider();
      cache.channels.set(cacheKey, fake);
      return fake;
    }
    throw new ChannelNotConfiguredError(channel);
  }

  // Touch credentials so decrypt path is exercised in tests when present.
  if (row.credentialsCiphertext) {
    decryptCredentials(row as unknown as EncryptedCredentialBlob);
  }

  const bundle = bundleFromRow(row);
  cache.channels.set(cacheKey, bundle);
  return bundle;
}

export async function getMailbox(
  tx: DbTransaction,
  orgId: string,
  mailboxId: string,
): Promise<MailboxProvider> {
  const cache = cacheFor(tx);
  const hit = cache.mailboxes.get(mailboxId);
  if (hit) return hit;

  const allowedStatuses = useFakeProviders()
    ? (['active', 'syncing_initial'] as const)
    : (['active'] as const);

  const [row] = await tx
    .select()
    .from(mailboxConnection)
    .where(
      and(
        eq(mailboxConnection.orgId, orgId),
        eq(mailboxConnection.id, mailboxId),
        inArray(mailboxConnection.status, [...allowedStatuses]),
      ),
    )
    .limit(1);

  if (!row) {
    if (useFakeProviders()) {
      const fake = createFakeMailboxProvider(mailboxId);
      cache.mailboxes.set(mailboxId, fake);
      return fake;
    }
    throw new MailboxNotFoundError();
  }

  if (useFakeProviders()) {
    const fake = createFakeMailboxProvider(mailboxId);
    cache.mailboxes.set(mailboxId, fake);
    return fake;
  }

  if (row.provider === 'google') {
    const live = createGoogleMailboxProvider({
      tx,
      orgId,
      userId: row.userId,
      mailboxId: row.id,
      emailAddress: row.emailAddress,
      accessTokenCiphertext: row.accessTokenCiphertext,
      refreshTokenCiphertext: row.refreshTokenCiphertext,
      tokenExpiresAt: row.tokenExpiresAt,
    });
    cache.mailboxes.set(mailboxId, live);
    return live;
  }

  throw new Error(`Live mailbox adapter not implemented for ${row.provider}`);
}
