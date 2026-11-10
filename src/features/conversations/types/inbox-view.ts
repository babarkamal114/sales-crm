import type { MessageChannel } from '@/domain/conversations/types';
import type { ChannelConsent, ContactContactability } from '@/domain/contacts/consent';

export type InboxView = 'mine' | 'unassigned' | 'all';
export type InboxChannelFilter = 'all' | MessageChannel | 'call';
export type InboxSort = 'new' | 'wait';

export type ThreadMessage =
  | { kind: 'day'; label: string }
  | { kind: 'event'; text: string; time: string }
  | {
      kind: 'message';
      direction: 'inbound' | 'outbound';
      channel: MessageChannel;
      subject?: string;
      text: string;
      time: string;
      by?: string;
      status?: string;
    }
  | {
      kind: 'comment';
      by: string;
      text: string;
      time: string;
    }
  | {
      kind: 'call';
      direction: 'inbound' | 'outbound';
      missed?: boolean;
      duration?: string;
      by?: string;
      text: string;
      time: string;
      recording?: boolean;
    };

export type InboxConversation = {
  id: string;
  firstName: string;
  lastName: string;
  avatarClass: string;
  role: string;
  company: string;
  contactId: string;
  companyId?: string;
  email: string;
  phone: string;
  lastChannel: MessageChannel | 'call';
  unread: boolean;
  timeLabel: string;
  waitingMinutes: number;
  assigneeId: string | null;
  status: 'open' | 'snoozed' | 'closed';
  snoozeLabel?: string;
  tags: string[];
  contact: ContactContactability;
  consent: ChannelConsent[];
  conversation: {
    lastInboundWhatsAppAt: Date | null;
    waWindowExpiresAt: Date | null;
  };
  deal?: {
    title: string;
    stage: string;
    value: number;
    progress: number;
  };
  task?: string | null;
  messages: ThreadMessage[];
  preview: string;
};

export type InboxScenario = {
  orgSettings: import('@/domain/conversations/types').SendingSettings;
  conversations: InboxConversation[];
  users: Record<string, { name: string; initials: string; avatarClass: string }>;
  currentUserId: string;
};
