/**
 * Seeds one demo contact + conversation + inbound email for live inbox testing.
 *
 * Usage:
 *   pnpm db:seed-conversations-demo
 *
 * Then open the printed URL (sign in as the org member first).
 */
import { randomBytes } from 'node:crypto';
import { config } from 'dotenv';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../src/server/db/client';
import {
  contact,
  contactConsent,
  conversation,
  integrationConnection,
  membership,
  message,
  user,
} from '../src/server/db/schema';

config({ path: '.env.local' });
config({ path: '.env' });

const DEMO_EMAIL = 'grace.demo@brightpath.example';
const DEMO_DISPLAY = 'Grace Lin (demo)';

function replyToken(): string {
  return randomBytes(16).toString('hex');
}

async function main() {
  const db = getDb();
  const [member] = await db.select().from(membership).limit(1);
  if (!member) {
    console.error('No membership found. Sign up or run pnpm db:seed-admin first.');
    process.exit(1);
  }

  const session = {
    orgId: member.orgId,
    userId: member.userId,
    role: member.role,
  };

  const now = new Date();
  const inboundAt = new Date(now.getTime() - 15 * 60 * 1000);

  let contactId: string;
  const [existingContact] = await db
    .select({ id: contact.id })
    .from(contact)
    .where(and(eq(contact.orgId, session.orgId), eq(contact.emailNormalised, DEMO_EMAIL)))
    .limit(1);

  if (existingContact) {
    contactId = existingContact.id;
    console.log('Contact already exists:', contactId);
  } else {
    const [created] = await db
      .insert(contact)
      .values({
        orgId: session.orgId,
        displayName: DEMO_DISPLAY,
        firstName: 'Grace',
        lastName: 'Lin',
        email: DEMO_EMAIL,
        emailNormalised: DEMO_EMAIL,
        phoneE164: '+447700900412',
        phoneType: 'mobile',
        jobTitle: 'Managing Director',
        ownerId: session.userId,
        recipientType: 'individual',
        source: 'Seed · Inbound email',
        lastActivityAt: inboundAt,
        createdBy: session.userId,
        updatedBy: session.userId,
      })
      .returning({ id: contact.id });
    if (!created) throw new Error('Contact insert failed');
    contactId = created.id;
    console.log('Created contact:', contactId);

    for (const channel of ['email', 'sms', 'whatsapp', 'call'] as const) {
      await db.insert(contactConsent).values({
        orgId: session.orgId,
        contactId,
        channel,
        dnd: false,
        marketingConsent: 'granted',
        source: 'user_entered',
        updatedBy: session.userId,
      });
    }
  }

  for (const row of [
    { provider: 'google', capability: 'email' },
    { provider: 'twilio', capability: 'telephony' },
  ]) {
    const [conn] = await db
      .select({ id: integrationConnection.id })
      .from(integrationConnection)
      .where(
        and(
          eq(integrationConnection.orgId, session.orgId),
          eq(integrationConnection.provider, row.provider),
        ),
      )
      .limit(1);
    if (conn) {
      await db
        .update(integrationConnection)
        .set({ status: 'connected', capability: row.capability, updatedAt: now })
        .where(eq(integrationConnection.id, conn.id));
    } else {
      await db.insert(integrationConnection).values({
        orgId: session.orgId,
        provider: row.provider,
        capability: row.capability,
        status: 'connected',
        connectedBy: session.userId,
        connectedAt: now,
      });
    }
  }

  let conversationId: string;
  const [existingConv] = await db
    .select({ id: conversation.id })
    .from(conversation)
    .where(and(eq(conversation.orgId, session.orgId), eq(conversation.contactId, contactId)))
    .limit(1);

  if (existingConv) {
    conversationId = existingConv.id;
    console.log('Conversation already exists:', conversationId);
  } else {
    const token = replyToken();
    const [createdConv] = await db
      .insert(conversation)
      .values({
        orgId: session.orgId,
        contactId,
        status: 'open',
        assigneeId: session.userId,
        lastMessageAt: inboundAt,
        lastInboundAt: inboundAt,
        waitingSince: inboundAt,
        lastChannel: 'email',
        replyToken: token,
        createdBy: session.userId,
        updatedBy: session.userId,
      })
      .returning({ id: conversation.id, replyToken: conversation.replyToken });
    if (!createdConv) throw new Error('Conversation insert failed');
    conversationId = createdConv.id;
    console.log('Created conversation:', conversationId, 'reply_token:', createdConv.replyToken);
  }

  const [existingMsg] = await db
    .select({ id: message.id })
    .from(message)
    .where(
      and(
        eq(message.orgId, session.orgId),
        eq(message.conversationId, conversationId),
        eq(message.direction, 'inbound'),
      ),
    )
    .limit(1);

  if (!existingMsg) {
    await db.insert(message).values({
      orgId: session.orgId,
      conversationId,
      contactId,
      channel: 'email',
      direction: 'inbound',
      purpose: 'conversation',
      subject: 'Re: Your demo on Wednesday',
      bodyText:
        'Hi,\n\nSorry, something has come up on Wednesday. Could we move the demo to Thursday morning instead?\n\nThanks,\nGrace',
      preview: 'Sorry, something has come up on Wednesday…',
      fromAddress: DEMO_EMAIL,
      toAddress: 'inbox@demo.local',
      status: 'delivered',
      createdAt: inboundAt,
      updatedAt: inboundAt,
    });
    console.log('Added inbound email message.');
  } else {
    console.log('Inbound message already present.');
  }

  const [owner] = await db
    .select({ fullName: user.fullName, email: user.email })
    .from(user)
    .where(eq(user.id, session.userId))
    .limit(1);

  const base =
    process.env.NEXT_PUBLIC_CRM_APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
  const url = `${base}/conversations?c=${conversationId}`;

  console.log('\n--- Live inbox ---');
  console.log(`Sign in as ${owner?.email ?? 'your admin user'}.`);
  console.log(url);
  console.log('\nReply in the composer uses the fake provider until Gmail/Twilio are wired.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
