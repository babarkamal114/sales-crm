# Dashboard — data contracts

This document defines filters, metrics, endpoint shapes, and SQL expectations for the CRM home
dashboard at `/` (signed-in `(crm)` group). All aggregates run in Postgres with tenant and visibility
rules applied in SQL (rules 03, 21). No widget loads full row sets into JavaScript.

## Shared filters

Every widget endpoint accepts the same query parameters unless noted.

| Parameter | Type | Values | Default |
|---|---|---|---|
| `pipeline` | UUID or `all` | One pipeline the user can access, or all accessible pipelines | Last saved per user, else `all` |
| `period` | enum | `today`, `week`, `month`, `quarter` | Last saved per user, else `month` |
| `scope` | enum | `mine`, `team` | Last saved per user, else `team` for Admin/Manager; always `mine` for Member |
| `viewAsUser` | UUID (optional) | Another user in the org; read-only “viewing as” chip | omitted |

### Filter rules

| Filter | Behaviour |
|---|---|
| **Pipeline** | Only pipelines the session may access. `all` = union of those pipelines. Members with one assigned pipeline see only that pipeline in the selector. |
| **Period** | Boundaries in the **organisation time zone** (default `Europe/London`). Week starts Monday. Quarter = calendar quarter containing “now”. |
| **Scope — Mine** | Opportunities the user **owns** or is **assigned** to; contacts the user **owns**; tasks **assigned** to the user; activity where the user is actor or assignee on the related record (per activity visibility). |
| **Scope — Team** | Everything the session role may see in the org (Admin/Manager full org visibility; Member still limited to assigned pipelines and visible contacts). |
| **viewAsUser** | Admin/Manager only. Recomputes Mine-scoped metrics as if the selected user were the viewer. Does not impersonate their session. Forbidden for Members (`403`). |

### Period instants (organisation TZ)

Let `now` be the request time, `tz` = org time zone.

| Period | Start (inclusive) | End (exclusive) |
|---|---|---|
| `today` | `startOfDay(now, tz)` | `startOfDay(now, tz) + 1 day` |
| `week` | Start of ISO week (Monday) containing `now` in `tz` | Start of next week |
| `month` | First day of calendar month containing `now` in `tz` | First day of next month |
| `quarter` | First day of calendar quarter containing `now` in `tz` | First day of next quarter |

**Previous equivalent period** (for won delta and similar): same length window immediately before the
current period’s start (e.g. month-to-date vs same day range in prior month).

### URL and persistence

- Filters are reflected in the URL: `?pipeline=&period=&scope=&viewAsUser=`.
- Last chosen `pipeline`, `period`, and `scope` are stored per user (org-scoped preference row or
  JSON column on membership). Server applies defaults when query params are absent.

### Shared Zod schema

```ts
export const dashboardFiltersSchema = z.object({
  pipeline: z.union([z.literal('all'), z.uuid()]),
  period: z.enum(['today', 'week', 'month', 'quarter']),
  scope: z.enum(['mine', 'team']),
  viewAsUser: z.uuid().optional(),
});
```

Route handlers parse search params, resolve accessible pipelines, force `scope: 'mine'` and strip
`viewAsUser` for Members, and reject `pipeline` IDs the user cannot access (`404`).

---

## Metric definitions

Deltas: increase → mint `▲`; decrease → neutral grey `▼`. Rose only for problem states (overdue,
failed), not for “quieter week”.

| Metric | Definition |
|---|---|
| **Open pipeline** | Sum of `value_pence` for opportunities with `status = 'open'` in scope and pipeline filter. **Not** period-filtered. Include `openCount`. |
| **Open pipeline delta** | Change vs open pipeline **value** at the same point in the **previous period**, from nightly snapshot table `crm.dashboard_pipeline_snapshot`. **Omit delta** until ≥2 snapshots exist for the org. |
| **Won this period** | Sum and count of opportunities with `status = 'won'` and `won_at` in `[periodStart, periodEnd)`. |
| **Won delta** | Won value in current period vs previous equivalent period (same definition as filters). |
| **New leads** | Count of contacts with `created_at` in period, in scope. Subtitle: top two `first_touch_source` values by count (ties broken alphabetically). |
| **Tasks due today** | Open tasks assigned to viewer (`viewAsUser` or session user), due on viewer’s **local calendar day** (user TZ for display; due timestamps stored UTC). `overdueCount` = open tasks with due before start of viewer’s today. Progress = `completedToday / (completedToday + openDueToday + overdueCount)`. |
| **Stage bars** | Per stage in selected pipeline: count and sum `value_pence` of **open** opportunities in scope. **Won** / **Lost** pseudo-bars: count and sum for opportunities with `won_at` / `lost_at` in period (pipeline + scope). |
| **Lead to won** | Among opportunities **created** in period in this pipeline (scope applied), percentage with `status = 'won'` (any `won_at`). Denominator excludes deleted. |
| **Average won deal** | `(won value in period) / (won count in period)`; null if count 0. |
| **Average time to win** | Mean `extract(epoch from (won_at - created_at)) / 86400` for deals won in period. |
| **Awaiting a decision** | Sum `value_pence` of open opportunities in the **last open stage** (max `position` where stage is not Won/Lost terminal). |
| **Lead sources** | Contacts created in period grouped by `first_touch_source`; per source: contact count, won opportunity count (any time). Top 4 sources + **Other** bucket. |
| **Payments** | From Stripe mirror (rule 26): totals **per currency** for paid in period, due within 7 days (org TZ dates), overdue. Never sum across currencies. |
| **Team** | Per user in team scope: `wonValuePence`, `wonCount`, `callsCount` in period. Admin/Manager only; Members get `403` on endpoint. |
| **Nudge** | Count of open opportunities in scope with **no open task** and **no activity** in last 7 days (org TZ). |

### Sparkline buckets (KPI cards)

Last 8 buckets within the selected period:

| Period | Bucket size |
|---|---|
| `today` | Hours |
| `week`, `month` | Days |
| `quarter` | Weeks |

Each bucket returns `{ label, valuePence | count }` appropriate to the KPI.

---

## Endpoints

Base path: `/api/v1/dashboard/` (GET). Auth: session cookie. Response: JSON body; errors use rule 07
HTTP mapping.

Each handler: `requireSession()` → parse filters → `dashboardService.<widget>(session, filters)`.

| Endpoint | Service method | Purpose |
|---|---|---|
| `/api/v1/dashboard/kpis` | `getKpis` | Four KPI cards + sparklines |
| `/api/v1/dashboard/pipeline` | `getPipeline` | Stage bars + footer metrics |
| `/api/v1/dashboard/tasks` | `getTasks` | My tasks today list + progress |
| `/api/v1/dashboard/conversations` | `getConversations` | Waiting for a reply |
| `/api/v1/dashboard/sources` | `getSources` | Lead source donut + legend |
| `/api/v1/dashboard/payments` | `getPayments` | Payment totals + urgent invoices |
| `/api/v1/dashboard/activity` | `getActivity` | Recent activity feed |
| `/api/v1/dashboard/team` | `getTeam` | Team leaderboard |
| `/api/v1/dashboard/nudge` | `getNudge` | Next-step nudge count |
| `/api/v1/dashboard/next-call` | `getNextCall` | Floating dialler pill |

Header subtitle counts (tasks + unread messages) may come from `/api/v1/dashboard/kpis` or a slim
`/api/v1/dashboard/header` if we split later; v1 can embed in `kpis` as `headerCounts`.

---

## View types (response shapes)

Types live in `src/domain/dashboard/types.ts` (branded IDs per rule 02).

### `DashboardFilters` (echoed in responses)

```ts
type DashboardFilters = {
  pipeline: PipelineId | 'all';
  period: 'today' | 'week' | 'month' | 'quarter';
  scope: 'mine' | 'team';
  viewAsUser?: UserId;
  periodStart: string; // ISO instant UTC
  periodEnd: string;
  orgTimeZone: string; // IANA
};
```

### `GET .../kpis`

```ts
type DashboardKpisResponse = {
  filters: DashboardFilters;
  openPipeline: {
    valuePence: number;
    openCount: number;
    delta?: { direction: 'up' | 'down' | 'flat'; label: string }; // omitted if no snapshots
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
    topSources: { source: string; count: number }[]; // max 2
    delta: Delta;
    sparkline: SparklinePoint[];
    href: string;
  };
  tasksDueToday: {
    openDueToday: number;
    overdueCount: number;
    completedToday: number;
    progressRatio: number; // 0–1
    delta?: Delta;
    sparkline: SparklinePoint[];
    href: string;
    moduleAvailable: boolean;
  };
  headerCounts?: { tasksDueToday: number; unreadMessages: number };
};

type SparklinePoint = { bucketStart: string; value: number };
type Delta = { direction: 'up' | 'down' | 'flat'; percent?: number; label: string };
```

### `GET .../pipeline`

```ts
type DashboardPipelineResponse = {
  filters: DashboardFilters;
  pipelineId: PipelineId;
  pipelineName: string;
  pipelineSelector: { id: PipelineId; name: string; openCount: number }[]; // when filter is `all`
  stages: {
    stageId: StageId;
    name: string;
    kind: 'open' | 'won' | 'lost';
    count: number;
    valuePence: number;
    avgDaysInStage?: number; // open stages only
    barMaxValuePence: number; // for scale
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
```

### `GET .../tasks`

```ts
type DashboardTasksResponse = {
  filters: DashboardFilters;
  moduleAvailable: boolean;
  progress: { completedToday: number; openDueToday: number; overdueCount: number; ratio: number };
  items: {
    taskId: TaskId;
    title: string;
    dueAt: string | null;
    status: 'overdue' | 'due_today' | 'completed_today';
    contactId: ContactId;
    contactName: string;
    contactHref: string;
    isRecurring: boolean;
  }[]; // max 6
  totalCount: number;
  viewAllHref: string;
};
```

### `GET .../conversations`

```ts
type DashboardConversationsResponse = {
  filters: DashboardFilters;
  moduleAvailable: boolean;
  items: {
    contactId: ContactId;
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
  }[]; // max 5
  inboxHref: string;
};
```

### `GET .../sources`

```ts
type DashboardSourcesResponse = {
  filters: DashboardFilters;
  totalContacts: number;
  segments: {
    source: string;
    count: number;
    percent: number;
    wonCount: number;
    colorToken: string; // brand ramp slot, not status colour
    href: string;
  }[]; // top 4 + Other
  accessibleSummary: string; // text alternative for chart
};
```

### `GET .../payments`

```ts
type DashboardPaymentsResponse = {
  filters: DashboardFilters;
  moduleAvailable: boolean;
  stripeConnected: boolean;
  canConnectStripe: boolean; // Admin
  totalsByCurrency: {
    currency: string; // ISO 4217
    paidThisPeriodPence: number;
    dueWithin7DaysPence: number;
    overduePence: number;
  }[];
  urgentInvoices: {
    invoiceId: InvoiceId;
    contactId: ContactId;
    contactName: string;
    currency: string;
    amountDuePence: number;
    dueDate: string; // ISO date
    status: 'overdue' | 'due_soon';
    href: string;
    canSendReminder: boolean;
  }[]; // max 3
};
```

### `GET .../activity`

```ts
type DashboardActivityResponse = {
  filters: DashboardFilters;
  moduleAvailable: boolean;
  items: ActivityFeedItem[]; // max 8, shared renderer type from rule 22
  viewAllHref: string;
};
```

### `GET .../team`

```ts
type DashboardTeamResponse = {
  filters: DashboardFilters;
  forbidden?: false;
  metric: 'won_value' | 'won_count' | 'calls';
  members: {
    userId: UserId;
    fullName: string;
    avatarUrl?: string;
    wonValuePence: number;
    wonCount: number;
    callsCount: number;
    leaderPercent: number; // 0–100 relative to leader for selected metric
  }[];
};
// Members: HTTP 403, no body leak
```

### `GET .../nudge`

```ts
type DashboardNudgeResponse = {
  filters: DashboardFilters;
  count: number;
  href: string; // opportunities list with "no next step" filter
};
```

### `GET .../next-call`

```ts
type DashboardNextCallResponse = {
  filters: DashboardFilters;
  moduleAvailable: boolean;
  callingEnabled: boolean;
  item?: {
    taskId?: TaskId;
    contactId: ContactId;
    contactName: string;
    companyName?: string;
    scheduledAt: string;
    href: string;
  };
};
```

---

## SQL and indexing notes

### Visibility (all widgets)

- Join opportunities → pipeline → `pipeline_membership` (or equivalent) for Members.
- Contacts: owner, follower, or linked open/won opportunity in accessible pipeline (rule 21).
- Apply `org_id = session.orgId` on every table; use `withTenant(session)` in repositories.

### Suggested aggregates (single round-trip per widget)

| Widget | SQL approach |
|---|---|
| **kpis** | One query with conditional aggregates (`FILTER (WHERE ...)`) for open/won/leads/tasks; sparklines via `date_trunc` bucket grouped query or materialized daily rollups. |
| **pipeline** | `GROUP BY stage_id` for open; separate aggregate for won/lost in period; `max(position)` subquery for awaiting decision. |
| **tasks** | Index `(org_id, assignee_id, due_at) WHERE status = 'open'`. Order: overdue first, then due time. |
| **conversations** | Distinct-on (`contact_id`) ordered by last inbound `occurred_at` where no outbound after; heavy — index `(org_id, contact_id, direction, occurred_at DESC)`. |
| **sources** | `GROUP BY first_touch_source` on contacts created in period; lateral join or second aggregate for won counts. |
| **payments** | `GROUP BY currency` on mirror tables; urgent invoices `ORDER BY overdue DESC, due_date ASC LIMIT 3`. |
| **activity** | Index `(org_id, occurred_at DESC)` with visibility join; `LIMIT 8`. |
| **team** | `GROUP BY user_id` on opportunities (won) and call logs in period; one query with subselects or CTE. |
| **nudge** | Anti-join: open opportunities left join open tasks and recent activity HAVING none. |

### Snapshots (open pipeline delta)

Nightly job writes per org (and optionally per pipeline):

`dashboard_pipeline_snapshot (org_id, pipeline_id nullable, captured_at, open_value_pence, open_count)`

Compare snapshot nearest to `periodStart - 1 day` vs current live open total.

### Performance target

Each endpoint < 300 ms on large seed at p95 (rule 09). Validate with skill `query-performance-check`.

---

## Module availability (S8)

Until backend modules exist, endpoints return `moduleAvailable: false` and UI shows Scenario S12
“Coming soon” (not error). KPI row hides or shows “Not available” per widget.

| Module | CRM status (pre-dashboard build) | Widgets affected |
|---|---|---|
| Pipelines & opportunities | **Not built** (no schema beyond auth) | KPI open/won, pipeline, nudge, team (partial) |
| Contacts | **Not built** | New leads, sources |
| Tasks | **Placeholder route only** | Tasks KPI, tasks panel, next-call |
| Conversations / messaging | **Not built** | Waiting for reply, header unread count |
| Activity feed | **Not built** | Recent activity |
| Payments / Stripe mirror | **Not built** | Payments panel |
| Telephony / dialler | **Not built** | Header dialler, next-call button |
| Global search (Ctrl K) | **Not built** | Header search disabled + tooltip |
| Notifications | **Not built** | Header bell |
| Realtime | **Not built** | Live indicator, live updates |
| Dashboard snapshots | **Not built** | Open pipeline delta hidden |

---

## Realtime invalidation map (phase 6)

When rule 27 is wired:

| Event | Invalidate |
|---|---|
| Opportunity created/updated/won/lost | `kpis`, `pipeline`, `team`, `nudge`, `activity` |
| Message inbound/outbound/read | `conversations`, `headerCounts` |
| Task created/completed/updated | `tasks`, `kpis`, `next-call` |
| Payment / invoice updated | `payments`, `activity` |

---

## Dev preview (`?scenario=`)

Until SQL-backed services land, `/api/v1/dashboard/*` serves fixture data. In local dev, append
`scenario` to the dashboard URL:

| Scenario | URL | Behaviour |
|---|---|---|
| Populated (default for Admin/Manager) | `/` | Matches the HTML mock |
| New organisation | `/?scenario=new-org` | Welcome checklist (S1) |
| Empty period | `/?scenario=empty` | Zeros and empty lists (S2) |
| Module unavailable | `/?scenario=module-unavailable` | S8 “Coming soon” panels |
| Stripe disconnected | `/?scenario=stripe-disconnected` | S9 payments states |

Filters: `?period=week&scope=mine` (Members always get `scope=mine`; Team panel hidden).

---

## Deviations from reference HTML (planned)

- Reference includes dark mode via `prefers-color-scheme`; CRM is **light only** (no dark tokens).
- Sidebar nav in reference lists Conversations, Documents, Reports; CRM v1 shell matches current CRM
  nav (Opportunities, Contacts, Companies, Tasks, Settings) plus **Dashboard** at `/`.
- Chart implementation follows Sponsora reports: **inline SVG**, no new chart npm package.
