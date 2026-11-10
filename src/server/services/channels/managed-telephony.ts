import 'server-only';

import { and, eq } from 'drizzle-orm';
import { getChannel } from '@/channels/registry';
import { encryptCredentials, generateWebhookSecret } from '@/channels/credentials';
import { writeAudit } from '@/server/audit/write';
import {
  channelConnection,
  channelEvent,
  phoneNumber,
  regulatoryProfile,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  assertManagedOutboundAllowed,
  recordChannelUsage,
  recordManagedNumberRentals,
} from '@/server/services/channels/usage-billing';
export async function ensureManagedTelephonyConnections(
  tx: DbTransaction,
  session: TenantSession,
): Promise<{ smsConnectionId: string; voiceConnectionId: string }> {
  if (session.role !== 'admin') throw new Error('Admin only');

  const make = async (channel: 'sms' | 'voice') => {
    const [existing] = await tx
      .select({ id: channelConnection.id })
      .from(channelConnection)
      .where(
        and(
          eq(channelConnection.orgId, session.orgId),
          eq(channelConnection.channel, channel),
          eq(channelConnection.mode, 'managed'),
        ),
      )
      .limit(1);

    if (existing) return existing.id;

    const webhook = encryptCredentials(generateWebhookSecret());
    const [row] = await tx
      .insert(channelConnection)
      .values({
        orgId: session.orgId,
        channel,
        mode: 'managed',
        provider: 'twilio',
        status: 'pending',
        statusReason: 'Subaccount provisioning (stub)',
        providerIds: { subaccountSid: `AC_fake_${session.orgId.slice(0, 8)}` },
        credentialsCiphertext: webhook.credentialsCiphertext,
        credentialsKeyId: webhook.credentialsKeyId,
        credentialsLast4: webhook.credentialsLast4,
        webhookSecretCiphertext: webhook.credentialsCiphertext,
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
      detail: { mode: 'managed', channel },
      createdBy: session.userId,
    });

    return row!.id;
  };

  return { smsConnectionId: await make('sms'), voiceConnectionId: await make('voice') };
}

export async function submitRegulatoryProfile(
  tx: DbTransaction,
  session: TenantSession,
  input: {
    legalName: string;
    companyNumber?: string;
    contactName: string;
    contactEmail: string;
  },
): Promise<{ status: 'submitted' | 'approved' | 'rejected'; rejectionReason?: string }> {
  if (session.role !== 'admin') throw new Error('Admin only');

  const [existing] = await tx
    .select({ id: regulatoryProfile.id })
    .from(regulatoryProfile)
    .where(eq(regulatoryProfile.orgId, session.orgId))
    .limit(1);

  const payload = {
    orgId: session.orgId,
    legalName: input.legalName.trim(),
    companyNumber: input.companyNumber?.trim() || null,
    contactName: input.contactName.trim(),
    contactEmail: input.contactEmail.trim(),
    status: 'submitted',
    address: {},
  };

  if (existing) {
    await tx
      .update(regulatoryProfile)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(regulatoryProfile.id, existing.id));
  } else {
    await tx.insert(regulatoryProfile).values(payload);
  }

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'integration.connected',
    entityType: 'organisation',
    entityId: session.orgId,
    metadata: { regulatoryProfile: 'submitted' },
  });

  // Fake review: reject if company number missing
  if (!input.companyNumber?.trim()) {
    await tx
      .update(regulatoryProfile)
      .set({
        status: 'rejected',
        rejectionReason: 'Companies House number is required for UK number bundles.',
        updatedAt: new Date(),
      })
      .where(eq(regulatoryProfile.orgId, session.orgId));
    return { status: 'rejected', rejectionReason: 'Companies House number is required for UK number bundles.' };
  }

  await tx
    .update(regulatoryProfile)
    .set({ status: 'approved', rejectionReason: null, updatedAt: new Date() })
    .where(eq(regulatoryProfile.orgId, session.orgId));

  return { status: 'approved' };
}

export async function purchaseManagedNumber(
  tx: DbTransaction,
  session: TenantSession,
  input: { e164: string; type: 'mobile' | 'local' },
): Promise<{ phoneNumberId: string; e164: string }> {
  if (session.role !== 'admin') throw new Error('Admin only');

  const [reg] = await tx
    .select({ status: regulatoryProfile.status })
    .from(regulatoryProfile)
    .where(eq(regulatoryProfile.orgId, session.orgId))
    .limit(1);

  if (reg?.status !== 'approved') {
    throw new Error('Business details must be approved before purchasing a number.');
  }

  await ensureManagedTelephonyConnections(tx, session);
  const bundle = await getChannel(tx, session.orgId, 'sms');
  const numbers = bundle.numbers;
  if (!numbers) throw new Error('Number provider unavailable');

  const purchased = await numbers.purchase(input.e164, 'BU_fake_bundle');

  const [row] = await tx
    .insert(phoneNumber)
    .values({
      orgId: session.orgId,
      connectionId: bundle.connectionId,
      e164: purchased.e164,
      type: input.type,
      capabilities:
        input.type === 'mobile'
          ? { voice: true, sms: true, mms: false }
          : { voice: true, sms: false, mms: false },
      providerSid: purchased.providerSid,
      isDefaultForSms: input.type === 'mobile',
      isDefaultForVoice: true,
      status: 'active',
      purchasedAt: new Date(),
    })
    .returning({ id: phoneNumber.id });

  await tx
    .update(channelConnection)
    .set({ status: 'active', statusReason: null, updatedAt: new Date(), updatedBy: session.userId })
    .where(eq(channelConnection.id, bundle.connectionId));

  await recordManagedNumberRentals(tx, session.orgId);

  return { phoneNumberId: row!.id, e164: purchased.e164 };
}

export async function sendManagedSmsTest(
  tx: DbTransaction,
  session: TenantSession,
  input: { to: string; body: string },
): Promise<{ providerMessageId: string }> {
  if (session.role !== 'admin') throw new Error('Admin only');
  await assertManagedOutboundAllowed(tx, session.orgId, 'sms', input.to);
  const bundle = await getChannel(tx, session.orgId, 'sms');
  if (!bundle.sms) throw new Error('SMS not configured');

  const [num] = await tx
    .select({ e164: phoneNumber.e164 })
    .from(phoneNumber)
    .where(and(eq(phoneNumber.orgId, session.orgId), eq(phoneNumber.isDefaultForSms, true)))
    .limit(1);

  const from = num?.e164 ?? '+447700900000';
  const result = await bundle.sms.send({ from, to: input.to, body: input.body });
  if (!result.ok) throw new Error(result.message);

  await recordChannelUsage(tx, {
    orgId: session.orgId,
    connectionId: bundle.connectionId,
    channel: 'sms',
    unit: 'segment',
    quantity: 1,
    providerReference: `sms:test:${result.providerMessageId}`,
    direction: 'outbound',
  });

  return { providerMessageId: result.providerMessageId };
}
