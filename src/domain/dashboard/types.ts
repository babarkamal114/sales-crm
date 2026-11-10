import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';

export type { DashboardFiltersInput };

export type DashboardFilters = DashboardFiltersInput & {
  periodStart: string;
  periodEnd: string;
  orgTimeZone: string;
};

export type DeltaDirection = 'up' | 'down' | 'flat';

export type Delta = {
  direction: DeltaDirection;
  label: string;
  percent?: number;
};

export type SparklinePoint = { bucketStart: string; value: number };

export type DashboardKpisResponse = {
  filters: DashboardFilters;
  moduleAvailable: boolean;
  openPipeline: {
    valuePence: number;
    openCount: number;
    delta?: Delta;
    sparkline: SparklinePoint[];
    href: string;
  };
  wonThisPeriod: {
    valuePence: number;
    wonCount: number;
    delta: Delta;
    sparkline: SparklinePoint[];
    href: string;
  };
  newLeads: {
    count: number;
    topSources: { source: string; count: number }[];
    delta: Delta;
    sparkline: SparklinePoint[];
    href: string;
  };
  tasksDueToday: {
    openDueToday: number;
    overdueCount: number;
    completedToday: number;
    progressRatio: number;
    delta?: Delta;
    sparkline: SparklinePoint[];
    href: string;
    moduleAvailable: boolean;
  };
  headerCounts: { tasksDueToday: number; unreadMessages: number };
};

export type DashboardPipelineResponse = {
  filters: DashboardFilters;
  moduleAvailable: boolean;
  pipelineId: string;
  pipelineName: string;
  pipelineSelector: { id: string; name: string; openCount: number }[];
  stages: {
    stageId: string;
    name: string;
    kind: 'open' | 'won' | 'lost';
    count: number;
    valuePence: number;
    avgDaysInStage?: number;
    barMaxValuePence: number;
    href: string;
  }[];
  footer: {
    leadToWonPercent: number | null;
    averageWonDealPence: number | null;
    averageDaysToWin: number | null;
    awaitingDecisionPence: number;
  };
  boardHref: string;
};

export type DashboardTasksResponse = {
  filters: DashboardFilters;
  moduleAvailable: boolean;
  progress: {
    completedToday: number;
    openDueToday: number;
    overdueCount: number;
    ratio: number;
  };
  items: {
    taskId: string;
    title: string;
    dueAt: string | null;
    status: 'overdue' | 'due_today' | 'completed_today';
    contactId: string;
    contactName: string;
    contactHref: string;
    isRecurring: boolean;
  }[];
  totalCount: number;
  viewAllHref: string;
};

export type DashboardConversationsResponse = {
  filters: DashboardFilters;
  moduleAvailable: boolean;
  items: {
    contactId: string;
    contactName: string;
    companyName?: string;
    channel: 'email' | 'sms' | 'whatsapp' | 'call';
    preview: string;
    occurredAt: string;
    unread: boolean;
    missedCall?: boolean;
    voicemailSeconds?: number;
    whatsappTemplateNeeded?: boolean;
    href: string;
  }[];
  inboxHref: string;
};

export type DashboardSourcesResponse = {
  filters: DashboardFilters;
  moduleAvailable: boolean;
  totalContacts: number;
  segments: {
    source: string;
    count: number;
    percent: number;
    wonCount: number;
    colorToken: string;
    href: string;
  }[];
  accessibleSummary: string;
};

export type DashboardPaymentsResponse = {
  filters: DashboardFilters;
  moduleAvailable: boolean;
  stripeConnected: boolean;
  canConnectStripe: boolean;
  totalsByCurrency: {
    currency: string;
    paidThisPeriodPence: number;
    dueWithin7DaysPence: number;
    overduePence: number;
  }[];
  urgentInvoices: {
    invoiceId: string;
    contactId: string;
    contactName: string;
    currency: string;
    amountDuePence: number;
    dueDate: string;
    status: 'overdue' | 'due_soon';
    href: string;
    canSendReminder: boolean;
  }[];
};

export type DashboardActivityItem = {
  id: string;
  icon: 'won' | 'call' | 'move' | 'payment' | 'lead';
  actorName: string;
  body: string;
  detail?: string;
  aiSummary?: string;
  occurredAt: string;
  href: string;
};

export type DashboardActivityResponse = {
  filters: DashboardFilters;
  moduleAvailable: boolean;
  items: DashboardActivityItem[];
  viewAllHref: string;
};

export type DashboardTeamResponse = {
  filters: DashboardFilters;
  moduleAvailable: boolean;
  metric: 'won_value' | 'won_count' | 'calls';
  members: {
    userId: string;
    fullName: string;
    wonValuePence: number;
    wonCount: number;
    callsCount: number;
    leaderPercent: number;
  }[];
};

export type DashboardNudgeResponse = {
  filters: DashboardFilters;
  moduleAvailable: boolean;
  count: number;
  href: string;
};

export type DashboardNextCallResponse = {
  filters: DashboardFilters;
  moduleAvailable: boolean;
  callingEnabled: boolean;
  item?: {
    taskId?: string;
    contactId: string;
    contactName: string;
    companyName?: string;
    scheduledAt: string;
    href: string;
  };
};

export type DashboardWelcomeChecklistItem = {
  id: string;
  label: string;
  href: string;
  done: boolean;
  description?: string;
  /** When true, expand inline setup on the dashboard instead of navigating away. */
  inlineSetup?: boolean;
};

export type DashboardWelcomeResponse = {
  showWelcome: boolean;
  mode?: 'hidden' | 'getting_started' | 'continue_onboarding' | 'member_getting_started' | 'preview';
  title?: string;
  subtitle?: string;
  progress?: { completed: number; total: number };
  primaryAction?: { label: string; href: string };
  checklist: DashboardWelcomeChecklistItem[];
};
