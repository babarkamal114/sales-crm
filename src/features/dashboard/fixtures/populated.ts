import type {
  DashboardActivityResponse,
  DashboardConversationsResponse,
  DashboardFilters,
  DashboardKpisResponse,
  DashboardNextCallResponse,
  DashboardNudgeResponse,
  DashboardPaymentsResponse,
  DashboardPipelineResponse,
  DashboardSourcesResponse,
  DashboardTasksResponse,
  DashboardTeamResponse,
  DashboardWelcomeResponse,
} from '@/domain/dashboard/types';
import { welcomePreviewSnapshot } from '@/domain/dashboard/welcome-fixtures';
import { resolveWelcomeResponse } from '@/domain/dashboard/welcome-resolve';

const sparkline = (values: number[]) =>
  values.map((value, index) => ({
    bucketStart: new Date(Date.now() - (values.length - index) * 86_400_000).toISOString(),
    value,
  }));

export function populatedKpis(filters: DashboardFilters): DashboardKpisResponse {
  return {
    filters,
    moduleAvailable: true,
    openPipeline: {
      valuePence: 8_425_000,
      openCount: 42,
      delta: { direction: 'up', label: '▲ 8%', percent: 8 },
      sparkline: sparkline([7200, 7400, 7600, 7800, 8000, 8100, 8300, 8425]),
      href: '/opportunities?pipeline=meta-ad-leads',
    },
    wonThisPeriod: {
      valuePence: 1_840_000,
      wonCount: 7,
      delta: { direction: 'up', label: '▲ 12% vs last period', percent: 12 },
      sparkline: sparkline([1200, 1300, 1400, 1500, 1600, 1700, 1800, 1840]),
      href: '/opportunities?status=won',
    },
    newLeads: {
      count: 36,
      topSources: [
        { source: 'Meta ads', count: 21 },
        { source: 'Website', count: 9 },
      ],
      delta: { direction: 'flat', label: 'No change' },
      sparkline: sparkline([4, 6, 5, 8, 7, 9, 10, 36]),
      href: '/contacts?period=week',
    },
    tasksDueToday: {
      openDueToday: 9,
      overdueCount: 3,
      completedToday: 4,
      progressRatio: 4 / 13,
      sparkline: sparkline([2, 3, 4, 5, 6, 7, 8, 9]),
      href: '/tasks?due=today',
      moduleAvailable: true,
    },
    headerCounts: { tasksDueToday: 9, unreadMessages: 5 },
  };
}

export function populatedPipeline(filters: DashboardFilters): DashboardPipelineResponse {
  const stages = [
    { name: 'New lead', kind: 'open' as const, count: 14, valuePence: 1_260_000 },
    { name: 'Contacted', kind: 'open' as const, count: 11, valuePence: 1_595_000 },
    { name: 'Interested', kind: 'open' as const, count: 8, valuePence: 1_720_000 },
    { name: 'Discovery call', kind: 'open' as const, count: 6, valuePence: 1_680_000 },
    { name: 'Proposal sent', kind: 'open' as const, count: 5, valuePence: 2_170_000 },
    { name: 'Won', kind: 'won' as const, count: 7, valuePence: 1_840_000 },
    { name: 'Lost', kind: 'lost' as const, count: 3, valuePence: 410_000 },
  ];
  const max = Math.max(...stages.map((stage) => stage.valuePence));

  return {
    filters,
    moduleAvailable: true,
    pipelineId: 'meta-ad-leads',
    pipelineName: 'Meta Ad Leads',
    pipelineSelector: [
      { id: 'meta-ad-leads', name: 'Meta Ad Leads', openCount: 44 },
      { id: 'inbound', name: 'Inbound', openCount: 12 },
    ],
    stages: stages.map((stage, index) => {
      const base = {
        stageId: `stage-${index}`,
        name: stage.name,
        kind: stage.kind,
        count: stage.count,
        valuePence: stage.valuePence,
        barMaxValuePence: max,
        href: `/opportunities?pipeline=meta-ad-leads&stage=${index}`,
      };
      if (stage.kind === 'open') {
        return { ...base, avgDaysInStage: 4 + index };
      }
      return base;
    }),
    footer: {
      leadToWonPercent: 18,
      averageWonDealPence: 262_857,
      averageDaysToWin: 23,
      awaitingDecisionPence: 2_170_000,
    },
    boardHref: '/opportunities?pipeline=meta-ad-leads',
  };
}

export function populatedTasks(filters: DashboardFilters): DashboardTasksResponse {
  return {
    filters,
    moduleAvailable: true,
    progress: { completedToday: 4, openDueToday: 6, overdueCount: 3, ratio: 4 / 13 },
    totalCount: 9,
    viewAllHref: '/tasks',
    items: [
      {
        taskId: 't1',
        title: 'Chase signed proposal',
        dueAt: null,
        status: 'overdue',
        contactId: 'c1',
        contactName: 'Daniel Okafor',
        contactHref: '/contacts/c1',
        isRecurring: false,
      },
      {
        taskId: 't2',
        title: 'Send pricing for 40 workers',
        dueAt: null,
        status: 'overdue',
        contactId: 'c2',
        contactName: 'Grace Lin',
        contactHref: '/contacts/c2',
        isRecurring: false,
      },
      {
        taskId: 't3',
        title: 'Call back about demo date',
        dueAt: new Date().toISOString(),
        status: 'due_today',
        contactId: 'c3',
        contactName: 'Leah Morris',
        contactHref: '/contacts/c3',
        isRecurring: false,
      },
      {
        taskId: 't4',
        title: 'Discovery call',
        dueAt: new Date().toISOString(),
        status: 'due_today',
        contactId: 'c4',
        contactName: 'Ahmed Raza',
        contactHref: '/contacts/c4',
        isRecurring: false,
      },
      {
        taskId: 't5',
        title: 'Weekly check-in (recurring)',
        dueAt: new Date().toISOString(),
        status: 'due_today',
        contactId: 'c5',
        contactName: 'Sophie Turner',
        contactHref: '/contacts/c5',
        isRecurring: true,
      },
      {
        taskId: 't6',
        title: 'Follow up on proposal',
        dueAt: new Date().toISOString(),
        status: 'completed_today',
        contactId: 'c6',
        contactName: 'Mark Ellis',
        contactHref: '/contacts/c6',
        isRecurring: false,
      },
    ],
  };
}

export function populatedConversations(
  filters: DashboardFilters,
): DashboardConversationsResponse {
  return {
    filters,
    moduleAvailable: true,
    inboxHref: '/contacts?tab=conversations',
    items: [
      {
        contactId: 'c2',
        contactName: 'Grace Lin',
        companyName: 'Oakfield Home Care',
        channel: 'whatsapp',
        preview: 'Could you send over the 40-worker price?',
        occurredAt: new Date(Date.now() - 45 * 60_000).toISOString(),
        unread: true,
        href: '/contacts/c2/conversations',
      },
      {
        contactId: 'c1',
        contactName: 'Daniel Okafor',
        companyName: 'Harbour View Care',
        channel: 'email',
        preview: 'Re: Proposal for Harbour View Care',
        occurredAt: new Date(Date.now() - 80 * 60_000).toISOString(),
        unread: true,
        href: '/contacts/c1/conversations',
      },
      {
        contactId: 'c3',
        contactName: 'Leah Morris',
        companyName: 'Meadowbank Nursing',
        channel: 'sms',
        preview: 'Tuesday afternoon works for us',
        occurredAt: new Date(Date.now() - 86_400_000).toISOString(),
        unread: true,
        href: '/contacts/c3/conversations',
      },
      {
        contactId: 'c4',
        contactName: 'Ahmed Raza',
        companyName: 'Riverside Support Ltd',
        channel: 'call',
        preview: 'Missed call · voicemail 0:42',
        occurredAt: new Date(Date.now() - 90_000_000).toISOString(),
        unread: false,
        missedCall: true,
        voicemailSeconds: 42,
        href: '/contacts/c4/conversations',
      },
    ],
  };
}

export function populatedSources(filters: DashboardFilters): DashboardSourcesResponse {
  return {
    filters,
    moduleAvailable: true,
    totalContacts: 142,
    accessibleSummary:
      'Facebook form 58 (4 won), Website form 31 (2 won), Referral 21 (1 won), Inbound call 17 (0 won), Other 15 (0 won)',
    segments: [
      {
        source: 'Facebook form',
        count: 58,
        percent: 41,
        wonCount: 4,
        colorToken: 'brand-700',
        href: '/contacts?source=facebook',
      },
      {
        source: 'Website form',
        count: 31,
        percent: 22,
        wonCount: 2,
        colorToken: 'brand-500',
        href: '/contacts?source=website',
      },
      {
        source: 'Referral',
        count: 21,
        percent: 15,
        wonCount: 1,
        colorToken: 'brand-300',
        href: '/contacts?source=referral',
      },
      {
        source: 'Inbound call',
        count: 17,
        percent: 12,
        wonCount: 0,
        colorToken: 'brand-100',
        href: '/contacts?source=inbound-call',
      },
      {
        source: 'Other',
        count: 15,
        percent: 10,
        wonCount: 0,
        colorToken: 'ink-300',
        href: '/contacts?source=other',
      },
    ],
  };
}

export function populatedPayments(
  filters: DashboardFilters,
  canConnectStripe: boolean,
): DashboardPaymentsResponse {
  return {
    filters,
    moduleAvailable: true,
    stripeConnected: true,
    canConnectStripe,
    totalsByCurrency: [
      {
        currency: 'GBP',
        paidThisPeriodPence: 1_294_000,
        dueWithin7DaysPence: 630_000,
        overduePence: 185_000,
      },
    ],
    urgentInvoices: [
      {
        invoiceId: 'inv-138',
        contactId: 'c1',
        contactName: 'Harbour View Care',
        currency: 'GBP',
        amountDuePence: 185_000,
        dueDate: '2026-09-26',
        status: 'overdue',
        href: '/contacts/c1/payments',
        canSendReminder: true,
      },
      {
        invoiceId: 'inv-142',
        contactId: 'c6',
        contactName: 'Elm Court Homes',
        currency: 'GBP',
        amountDuePence: 120_000,
        dueDate: '2026-10-05',
        status: 'due_soon',
        href: '/contacts/c6/payments',
        canSendReminder: true,
      },
    ],
  };
}

export function populatedActivity(filters: DashboardFilters): DashboardActivityResponse {
  return {
    filters,
    moduleAvailable: true,
    viewAllHref: '/activity',
    items: [
      {
        id: 'a1',
        icon: 'won',
        actorName: 'Sara Ahmed',
        body: 'won Willow Lane Care · Growth plan',
        detail: '£2,640 · Proposal sent → Won',
        occurredAt: new Date(Date.now() - 12 * 60_000).toISOString(),
        href: '/contacts/c-willow',
      },
      {
        id: 'a2',
        icon: 'call',
        actorName: 'You',
        body: 'called Meadowbank Nursing · 6 min 12 s',
        aiSummary:
          'Interested in tracking 18 sponsored carers. Wants a demo next Tuesday afternoon.',
        occurredAt: new Date(Date.now() - 48 * 60_000).toISOString(),
        href: '/contacts/c3',
      },
      {
        id: 'a3',
        icon: 'move',
        actorName: 'James Cole',
        body: 'moved Riverside Support Ltd to Discovery call',
        detail: 'Meta Ad Leads pipeline',
        occurredAt: new Date(Date.now() - 3_600_000).toISOString(),
        href: '/contacts/c4',
      },
    ],
  };
}

export function populatedTeam(filters: DashboardFilters): DashboardTeamResponse {
  return {
    filters,
    moduleAvailable: true,
    metric: 'won_value',
    members: [
      {
        userId: 'u1',
        fullName: 'Sara Ahmed',
        wonValuePence: 742_000,
        wonCount: 3,
        callsCount: 38,
        leaderPercent: 100,
      },
      {
        userId: 'u2',
        fullName: 'You',
        wonValuePence: 506_000,
        wonCount: 2,
        callsCount: 31,
        leaderPercent: 68,
      },
      {
        userId: 'u3',
        fullName: 'James Cole',
        wonValuePence: 324_000,
        wonCount: 1,
        callsCount: 27,
        leaderPercent: 44,
      },
    ],
  };
}

export function populatedNudge(filters: DashboardFilters): DashboardNudgeResponse {
  return {
    filters,
    moduleAvailable: true,
    count: 4,
    href: '/opportunities?filter=no-next-step',
  };
}

export function populatedNextCall(filters: DashboardFilters): DashboardNextCallResponse {
  return {
    filters,
    moduleAvailable: true,
    callingEnabled: false,
    item: {
      taskId: 't3',
      contactId: 'c3',
      contactName: 'Leah Morris',
      companyName: 'Meadowbank',
      scheduledAt: new Date().toISOString(),
      href: '/contacts/c3',
    },
  };
}

export function welcomeNewOrg(): DashboardWelcomeResponse {
  return resolveWelcomeResponse({
    scenario: 'new-org',
    role: 'admin',
    snapshot: welcomePreviewSnapshot(),
  });
}
