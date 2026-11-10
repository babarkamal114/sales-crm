import 'server-only';

import { and, eq } from 'drizzle-orm';
import { isManagedWhatsAppEnabled } from '@/domain/channels/feature-flags';
import type { WhatsAppChannelDetail } from '@/domain/channels/whatsapp-detail';
import { encryptCredentials, generateWebhookSecret } from '@/channels/credentials';
import { writeAudit } from '@/server/audit/write';
import {
  channelConnection,
  channelEvent,
  messageTemplate,
  whatsappSender,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

export async function getWhatsAppChannelDetail(
  tx: DbTransaction,
  session: TenantSession,
): Promise<WhatsAppChannelDetail> {
  const featureEnabled = isManagedWhatsAppEnabled();
  const liveEmbeddedSignup =
    Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()) &&
    Boolean(process.env.TWILIO_ISV_EMBEDDED_SIGNUP_CONFIG_ID?.trim());

  const [conn] = await tx
    .select({
      id: channelConnection.id,
      mode: channelConnection.mode,
      status: channelConnection.status,
      statusReason: channelConnection.statusReason,
    })
    .from(channelConnection)
    .where(
      and(
        eq(channelConnection.orgId, session.orgId),
        eq(channelConnection.channel, 'whatsapp'),
        eq(channelConnection.isDefault, true),
      ),
    )
    .limit(1);

  let sender: WhatsAppChannelDetail['sender'] = null;
  if (conn) {
    const [row] = await tx
      .select({
        wabaId: whatsappSender.wabaId,
        phoneNumberId: whatsappSender.phoneNumberId,
        displayName: whatsappSender.displayName,
        displayNameStatus: whatsappSender.displayNameStatus,
        qualityRating: whatsappSender.qualityRating,
        messagingLimitTier: whatsappSender.messagingLimitTier,
      })
      .from(whatsappSender)
      .where(
        and(eq(whatsappSender.orgId, session.orgId), eq(whatsappSender.connectionId, conn.id)),
      )
      .limit(1);
    sender = row ?? null;
  }

  const templates = await tx
    .select({
      id: messageTemplate.id,
      name: messageTemplate.name,
      whatsappTemplateName: messageTemplate.whatsappTemplateName,
      whatsappStatus: messageTemplate.whatsappStatus,
      language: messageTemplate.language,
      body: messageTemplate.body,
    })
    .from(messageTemplate)
    .where(
      and(eq(messageTemplate.orgId, session.orgId), eq(messageTemplate.channel, 'whatsapp')),
    );

  return {
    featureEnabled,
    liveEmbeddedSignup,
    connection: conn ?? null,
    sender,
    templates,
  };
}

async function ensureManagedWhatsAppConnection(
  tx: DbTransaction,
  session: TenantSession,
): Promise<string> {
  const [existing] = await tx
    .select({ id: channelConnection.id })
    .from(channelConnection)
    .where(
      and(
        eq(channelConnection.orgId, session.orgId),
        eq(channelConnection.channel, 'whatsapp'),
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
      channel: 'whatsapp',
      mode: 'managed',
      provider: 'twilio',
      status: 'pending',
      statusReason: 'Awaiting Embedded Signup',
      providerIds: { embeddedSignup: 'pending' },
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
    kind: 'embedded_signup_started',
    detail: { channel: 'whatsapp' },
    createdBy: session.userId,
  });

  return row!.id;
}

async function seedStarterTemplates(tx: DbTransaction, orgId: string): Promise<void> {
  const [existing] = await tx
    .select({ id: messageTemplate.id })
    .from(messageTemplate)
    .where(and(eq(messageTemplate.orgId, orgId), eq(messageTemplate.channel, 'whatsapp')))
    .limit(1);

  if (existing) return;

  await tx.insert(messageTemplate).values([
    {
      orgId,
      channel: 'whatsapp',
      name: 'Follow-up after event',
      body: 'Hi {{1}}, thanks for speaking with us at the event. Would you like to book a short call this week?',
      whatsappTemplateName: 'event_follow_up',
      whatsappStatus: 'approved',
      language: 'en_GB',
      category: 'utility',
    },
    {
      orgId,
      channel: 'whatsapp',
      name: 'Package reminder',
      body: 'Hello {{1}}, your sponsorship proposal is ready to review. Reply if you have any questions.',
      whatsappTemplateName: 'proposal_ready',
      whatsappStatus: 'pending',
      language: 'en_GB',
      category: 'utility',
    },
  ]);
}

/** Dev / fake Tech Provider completion — not used with live Meta UI. */
export async function completeManagedWhatsAppSimulator(
  tx: DbTransaction,
  session: TenantSession,
  input: { displayName?: string },
): Promise<{ connectionId: string }> {
  if (session.role !== 'admin') throw new Error('Admin only');
  if (!isManagedWhatsAppEnabled()) {
    throw new Error('Managed WhatsApp is not enabled for this environment.');
  }

  const connectionId = await ensureManagedWhatsAppConnection(tx, session);
  const suffix = session.orgId.slice(0, 8);
  const wabaId = `waba_sim_${suffix}`;
  const phoneNumberId = `pn_sim_${suffix}`;
  const displayName = input.displayName?.trim() || 'Sponsoro Business';

  await tx
    .insert(whatsappSender)
    .values({
      connectionId,
      orgId: session.orgId,
      wabaId,
      phoneNumberId,
      displayName,
      displayNameStatus: 'approved',
      qualityRating: 'GREEN',
      messagingLimitTier: 'TIER_1K',
    })
    .onConflictDoUpdate({
      target: whatsappSender.connectionId,
      set: {
        wabaId,
        phoneNumberId,
        displayName,
        displayNameStatus: 'approved',
        qualityRating: 'GREEN',
        messagingLimitTier: 'TIER_1K',
        updatedAt: new Date(),
      },
    });

  await tx
    .update(channelConnection)
    .set({
      status: 'active',
      statusReason: null,
      providerIds: { wabaId, phoneNumberId, subaccountSid: `AC_sim_${suffix}` },
      lastCheckedAt: new Date(),
      updatedAt: new Date(),
      updatedBy: session.userId,
    })
    .where(eq(channelConnection.id, connectionId));

  await seedStarterTemplates(tx, session.orgId);

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'integration.connected',
    entityType: 'channel_connection',
    entityId: connectionId,
    metadata: { channel: 'whatsapp', mode: 'managed', simulator: true },
  });

  return { connectionId };
}

export async function submitWhatsAppTemplateDraft(
  tx: DbTransaction,
  session: TenantSession,
  input: { name: string; body: string; language?: string },
): Promise<{ templateId: string }> {
  if (session.role !== 'admin') throw new Error('Admin only');

  const slug = input.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  const [row] = await tx
    .insert(messageTemplate)
    .values({
      orgId: session.orgId,
      channel: 'whatsapp',
      name: input.name.trim(),
      body: input.body.trim(),
      whatsappTemplateName: slug || 'custom_template',
      whatsappStatus: 'pending',
      language: input.language?.trim() || 'en_GB',
      category: 'utility',
    })
    .returning({ id: messageTemplate.id });

  return { templateId: row!.id };
}

/** Stub sync — marks pending templates as submitted to Meta (fake approves utility templates). */
export async function syncWhatsAppTemplatesFromProvider(
  tx: DbTransaction,
  session: TenantSession,
): Promise<{ updated: number }> {
  if (session.role !== 'admin') throw new Error('Admin only');

  const pending = await tx
    .select()
    .from(messageTemplate)
    .where(
      and(
        eq(messageTemplate.orgId, session.orgId),
        eq(messageTemplate.channel, 'whatsapp'),
        eq(messageTemplate.whatsappStatus, 'pending'),
      ),
    );

  if (
    pending.length === 0 ||
    !(process.env.CHANNELS_USE_FAKE === '1' || process.env.NODE_ENV === 'test')
  ) {
    return { updated: 0 };
  }

  let updated = 0;
  for (const tpl of pending) {
    await tx
      .update(messageTemplate)
      .set({ whatsappStatus: 'approved', active: true })
      .where(eq(messageTemplate.id, tpl.id));
    updated += 1;
  }

  return { updated };
}
