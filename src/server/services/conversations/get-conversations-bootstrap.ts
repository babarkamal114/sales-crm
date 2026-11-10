import 'server-only';

import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { previewText } from '@/domain/conversations/preview-text';
import type { InboxScenario } from '@/features/conversations/types/inbox-view';
import {
  company,
  contact,
  contactConsent,
  conversation,
  conversationComment,
  message,
  user,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { requireConversationView } from '@/server/services/conversations/conversation-access';
import { loadOrgSendingSettings } from '@/server/services/conversations/load-org-sending-settings';

function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} h`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function avatarClass(seed: string): string {
  const palette = [
    'bg-[#6473E8]',
    'bg-[#C2714F]',
    'bg-[#3E8E8A]',
    'bg-[#8A5BB8]',
    'bg-[#C0567A]',
  ];
  let n = 0;
  for (let i = 0; i < seed.length; i += 1) n += seed.charCodeAt(i);
  return palette[n % palette.length]!;
}

export async function getConversationsBootstrap(
  tx: DbTransaction,
  session: TenantSession,
  selectedId?: string | null,
): Promise<InboxScenario> {
  const orgSettings = await loadOrgSendingSettings(tx, session.orgId, session.userId);

  const convRows = await tx
    .select()
    .from(conversation)
    .where(eq(conversation.orgId, session.orgId))
    .orderBy(desc(conversation.lastMessageAt))
    .limit(100);

  const contactIds = [...new Set(convRows.map((c) => c.contactId))];
  const contacts =
    contactIds.length > 0
      ? await tx
          .select()
          .from(contact)
          .where(
            and(
              eq(contact.orgId, session.orgId),
              inArray(contact.id, contactIds),
              isNull(contact.deletedAt),
            ),
          )
      : [];
  const contactById = new Map(contacts.map((c) => [c.id, c]));

  const companyIds = [...new Set(contacts.map((c) => c.companyId).filter(Boolean))] as string[];
  const companies =
    companyIds.length > 0
      ? await tx
          .select({ id: company.id, name: company.name })
          .from(company)
          .where(eq(company.orgId, session.orgId))
      : [];
  const companyById = new Map(companies.map((c) => [c.id, c.name]));

  const userIds = new Set<string>([session.userId]);
  for (const conv of convRows) {
    if (conv.assigneeId) userIds.add(conv.assigneeId);
  }

  const users: InboxScenario['users'] = {};
  const userRows =
    userIds.size > 0
      ? await tx
          .select({ id: user.id, fullName: user.fullName })
          .from(user)
          .where(inArray(user.id, [...userIds]))
      : [];
  for (const u of userRows) {
    const parts = u.fullName.trim().split(/\s+/);
    const initials = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || '??';
    users[u.id] = {
      name: u.fullName,
      initials,
      avatarClass: avatarClass(u.id),
    };
  }
  users[session.userId] ??= {
    name: 'You',
    initials: 'ME',
    avatarClass: 'bg-[#6473E8]',
  };

  const conversations = [];
  for (const conv of convRows) {
    try {
      await requireConversationView(tx, session, conv.id);
    } catch {
      continue;
    }

    const c = contactById.get(conv.contactId);
    if (!c) continue;

    const consentRows = await tx
      .select({
        channel: contactConsent.channel,
        dnd: contactConsent.dnd,
        marketingConsent: contactConsent.marketingConsent,
      })
      .from(contactConsent)
      .where(
        and(eq(contactConsent.orgId, session.orgId), eq(contactConsent.contactId, c.id)),
      );

    const msgs = await tx
      .select()
      .from(message)
      .where(and(eq(message.orgId, session.orgId), eq(message.conversationId, conv.id)))
      .orderBy(message.createdAt);

    const comments = await tx
      .select()
      .from(conversationComment)
      .where(
        and(
          eq(conversationComment.orgId, session.orgId),
          eq(conversationComment.conversationId, conv.id),
          isNull(conversationComment.deletedAt),
        ),
      )
      .orderBy(conversationComment.createdAt);

    const threadItems: InboxScenario['conversations'][0]['messages'] = [];
    let lastDay = '';
    const pushDay = (d: Date) => {
      const label = d.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      if (label !== lastDay) {
        lastDay = label;
        threadItems.push({ kind: 'day', label });
      }
    };

    const timeline = [
      ...msgs.map((m) => ({ kind: 'message' as const, at: m.createdAt, m })),
      ...comments.map((c) => ({ kind: 'comment' as const, at: c.createdAt, c })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());

    for (const item of timeline) {
      pushDay(item.at);
      if (item.kind === 'message') {
        const m = item.m;
        threadItems.push({
          kind: 'message',
          direction: m.direction,
          channel: m.channel,
          ...(m.subject ? { subject: m.subject } : {}),
          text: m.bodyText ?? '',
          time: m.createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          ...(m.sentByUserId ? { by: m.sentByUserId } : {}),
          ...(m.status !== 'queued' ? { status: m.status } : {}),
        });
      } else {
        threadItems.push({
          kind: 'comment',
          by: item.c.authorId,
          text: item.c.body,
          time: item.c.createdAt.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        });
      }
    }

    const waitingMinutes = conv.waitingSince
      ? Math.floor((Date.now() - conv.waitingSince.getTime()) / 60_000)
      : 0;

    const lastChannel =
      conv.lastChannel ??
      (msgs[msgs.length - 1]?.channel as 'email' | 'sms' | 'whatsapp' | undefined) ??
      'email';

    conversations.push({
      id: conv.id,
      contactId: c.id,
      ...(c.companyId ? { companyId: c.companyId } : {}),
      firstName: c.firstName,
      lastName: c.lastName,
      avatarClass: avatarClass(c.id),
      role: c.jobTitle ?? '',
      company: c.companyId ? (companyById.get(c.companyId) ?? '') : '',
      email: c.email ?? '',
      phone: c.phoneE164 ?? '',
      lastChannel: lastChannel === 'email' || lastChannel === 'sms' || lastChannel === 'whatsapp'
        ? lastChannel
        : 'email',
      unread: Boolean(conv.waitingSince),
      timeLabel: conv.lastMessageAt ? formatTime(conv.lastMessageAt) : '',
      waitingMinutes,
      assigneeId: conv.assigneeId,
      status: conv.status,
      tags: [],
      contact: {
        email: c.email,
        phoneE164: c.phoneE164,
        recipientType: c.recipientType,
        restricted: c.restricted,
      },
      consent: consentRows.map((r) => ({
        channel: r.channel,
        dnd: r.dnd,
        marketingConsent: r.marketingConsent,
      })),
      conversation: {
        lastInboundWhatsAppAt:
          conv.waWindowExpiresAt != null
            ? new Date(conv.waWindowExpiresAt.getTime() - 24 * 60 * 60 * 1000)
            : null,
        waWindowExpiresAt: conv.waWindowExpiresAt,
      },
      task: null,
      preview:
        msgs[msgs.length - 1]?.preview ??
        previewText({
          bodyText: msgs[msgs.length - 1]?.bodyText ?? null,
        }),
      messages: selectedId === conv.id || convRows.length === 1 ? threadItems : threadItems.slice(-2),
    });
  }

  // Load full thread for selected conversation
  if (selectedId) {
    const idx = conversations.findIndex((c) => c.id === selectedId);
    if (idx >= 0 && conversations[idx]!.messages.length <= 2) {
      const full = conversations[idx]!;
      const conv = convRows.find((r) => r.id === selectedId);
      if (conv) {
        const msgs = await tx
          .select()
          .from(message)
          .where(and(eq(message.orgId, session.orgId), eq(message.conversationId, conv.id)))
          .orderBy(message.createdAt);
        const comments = await tx
          .select()
          .from(conversationComment)
          .where(
            and(
              eq(conversationComment.orgId, session.orgId),
              eq(conversationComment.conversationId, conv.id),
              isNull(conversationComment.deletedAt),
            ),
          )
          .orderBy(conversationComment.createdAt);
        const threadItems: typeof full.messages = [];
        let lastDay = '';
        const timeline = [
          ...msgs.map((m) => ({ kind: 'message' as const, at: m.createdAt, m })),
          ...comments.map((c) => ({ kind: 'comment' as const, at: c.createdAt, c })),
        ].sort((a, b) => a.at.getTime() - b.at.getTime());
        for (const item of timeline) {
          const label = item.at.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          });
          if (label !== lastDay) {
            lastDay = label;
            threadItems.push({ kind: 'day', label });
          }
          if (item.kind === 'message') {
            const m = item.m;
            threadItems.push({
              kind: 'message',
              direction: m.direction,
              channel: m.channel,
              ...(m.subject ? { subject: m.subject } : {}),
              text: m.bodyText ?? '',
              time: item.at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
              ...(m.sentByUserId ? { by: m.sentByUserId } : {}),
              status: m.status,
            });
          } else {
            threadItems.push({
              kind: 'comment',
              by: item.c.authorId,
              text: item.c.body,
              time: item.at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            });
          }
        }
        conversations[idx] = { ...full, messages: threadItems };
      }
    }
  }

  return {
    currentUserId: session.userId,
    orgSettings,
    users,
    conversations,
  };
}
