import 'server-only';

import { and, eq } from 'drizzle-orm';
import { encryptCredentials, generateWebhookSecret } from '@/channels/credentials';
import { createFakeSmsProvider, createFakeWhatsAppProvider, fakeSetAuthOk } from '@/channels/fake/fake-providers';
import { writeAudit } from '@/server/audit/write';
import { channelConnection, channelEvent, whatsappSender } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
async function testByoCredentials(
  channel: 'sms' | 'whatsapp',
  _accountSid: string,
  secret: string,
): Promise<{ ok: boolean; message: string }> {
  if (process.env.CHANNELS_USE_FAKE === '1' || process.env.NODE_ENV === 'test') {
    fakeSetAuthOk(secret !== 'bad_secret');
    const provider =
      channel === 'sms' ? createFakeSmsProvider() : createFakeWhatsAppProvider();
    const test = await provider.testConnection();
    return test.ok ? { ok: true, message: 'Connected' } : { ok: false, message: test.message };
  }
  return { ok: false, message: 'Live BYO verification not implemented yet.' };
}

export async function connectByoTwilio(
  tx: DbTransaction,
  session: TenantSession,
  input: { accountSid: string; authToken: string },
): Promise<{ connectionId: string; status: 'active' | 'failed'; error?: string }> {
  if (session.role !== 'admin') throw new Error('Admin only');

  const test = await testByoCredentials('sms', input.accountSid, input.authToken);
  if (!test.ok) {
    return { connectionId: '', status: 'failed', error: test.message };
  }

  const cred = encryptCredentials(`${input.accountSid}:${input.authToken}`);
  const wh = encryptCredentials(generateWebhookSecret());

  const [row] = await tx
    .insert(channelConnection)
    .values({
      orgId: session.orgId,
      channel: 'sms',
      mode: 'byo',
      provider: 'twilio',
      status: 'active',
      providerIds: { accountSid: input.accountSid },
      credentialsCiphertext: cred.credentialsCiphertext,
      credentialsKeyId: cred.credentialsKeyId,
      credentialsLast4: cred.credentialsLast4,
      webhookSecretCiphertext: wh.credentialsCiphertext,
      isDefault: true,
      connectedBy: session.userId,
      createdBy: session.userId,
      updatedBy: session.userId,
    })
    .returning({ id: channelConnection.id });

  const connectionId = row?.id;
  if (!connectionId) {
    const [existing] = await tx
      .select({ id: channelConnection.id })
      .from(channelConnection)
      .where(
        and(
          eq(channelConnection.orgId, session.orgId),
          eq(channelConnection.channel, 'sms'),
          eq(channelConnection.mode, 'byo'),
        ),
      )
      .limit(1);
    if (!existing) return { connectionId: '', status: 'failed', error: 'Could not save connection' };
    await tx
      .update(channelConnection)
      .set({
        status: 'active',
        credentialsCiphertext: cred.credentialsCiphertext,
        credentialsKeyId: cred.credentialsKeyId,
        credentialsLast4: cred.credentialsLast4,
        updatedAt: new Date(),
        updatedBy: session.userId,
      })
      .where(eq(channelConnection.id, existing.id));
    return { connectionId: existing.id, status: 'active' };
  }

  await tx.insert(channelEvent).values({
    orgId: session.orgId,
    connectionId,
    kind: 'connected',
    detail: { mode: 'byo', provider: 'twilio' },
    createdBy: session.userId,
  });

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'integration.connected',
    entityType: 'organisation',
    entityId: session.orgId,
    metadata: { channel: 'sms', mode: 'byo' },
  });

  return { connectionId, status: 'active' };
}

export async function markConnectionDegraded(
  tx: DbTransaction,
  session: TenantSession,
  connectionId: string,
  reason: string,
): Promise<void> {
  if (session.role !== 'admin') throw new Error('Admin only');
  await tx
    .update(channelConnection)
    .set({
      status: 'degraded',
      statusReason: reason,
      updatedAt: new Date(),
      updatedBy: session.userId,
    })
    .where(and(eq(channelConnection.orgId, session.orgId), eq(channelConnection.id, connectionId)));

  await tx.insert(channelEvent).values({
    orgId: session.orgId,
    connectionId,
    kind: 'health_check_failed',
    detail: { reason },
    createdBy: session.userId,
  });
}

export async function connectByoMetaWhatsApp(
  tx: DbTransaction,
  session: TenantSession,
  input: { wabaId: string; phoneNumberId: string; accessToken: string; appSecret: string },
): Promise<{ connectionId: string; status: 'active' | 'failed'; error?: string }> {
  if (session.role !== 'admin') throw new Error('Admin only');

  const test = await testByoCredentials('whatsapp', input.wabaId, input.accessToken);
  if (!test.ok) {
    return { connectionId: '', status: 'failed', error: test.message };
  }

  const cred = encryptCredentials(input.accessToken);
  const wh = encryptCredentials(input.appSecret);

  const [row] = await tx
    .insert(channelConnection)
    .values({
      orgId: session.orgId,
      channel: 'whatsapp',
      mode: 'byo',
      provider: 'meta',
      status: 'active',
      providerIds: { wabaId: input.wabaId, phoneNumberId: input.phoneNumberId },
      credentialsCiphertext: cred.credentialsCiphertext,
      credentialsKeyId: cred.credentialsKeyId,
      credentialsLast4: cred.credentialsLast4,
      webhookSecretCiphertext: wh.credentialsCiphertext,
      isDefault: true,
      connectedBy: session.userId,
      createdBy: session.userId,
      updatedBy: session.userId,
    })
    .returning({ id: channelConnection.id });

  await tx.insert(channelEvent).values({
    orgId: session.orgId,
    connectionId: row!.id,
    kind: 'connected',
    detail: { mode: 'byo', provider: 'meta' },
    createdBy: session.userId,
  });

  await tx
    .insert(whatsappSender)
    .values({
      connectionId: row!.id,
      orgId: session.orgId,
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
      displayName: null,
      displayNameStatus: 'pending',
      qualityRating: null,
      messagingLimitTier: null,
    })
    .onConflictDoUpdate({
      target: whatsappSender.connectionId,
      set: {
        wabaId: input.wabaId,
        phoneNumberId: input.phoneNumberId,
        updatedAt: new Date(),
      },
    });

  return { connectionId: row!.id, status: 'active' };
}
