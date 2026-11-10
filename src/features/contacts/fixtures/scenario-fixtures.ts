import type { ContactListResponse, ContactListRow, ContactListSummary } from '@/domain/contacts/list-view';
import type { ContactsDevScenario } from '@/domain/contacts/dev-scenario';
import { canContactSummary } from '@/domain/contacts/consent';

const now = new Date().toISOString();

function row(partial: Partial<ContactListRow> & Pick<ContactListRow, 'id' | 'displayName'>): ContactListRow {
  return {
    email: null,
    emailVerified: false,
    phoneE164: null,
    companyName: null,
    owner: { id: '00000000-0000-4000-8000-000000000001', fullName: 'Preview Owner', initials: 'PO' },
    tags: [],
    source: 'Preview',
    openDeal: null,
    canContact: canContactSummary(
      {
        email: partial.email ?? null,
        phoneE164: partial.phoneE164 ?? null,
        recipientType: 'individual',
        restricted: false,
      },
      [],
    ),
    lastActivityAt: now,
    createdAt: now,
    isStaleActivity: false,
    ...partial,
  };
}

const DISPLAY_FALLBACK_ROWS: ContactListRow[] = [
  row({
    id: '10000000-0000-4000-8000-000000000001',
    displayName:
      'Dr. Elizabeth Montgomery-Whitmore III, Head of Strategic Partnerships and Community Engagement',
    email: 'elizabeth.montgomery@example.com',
    companyName: 'Very Long Company Name Holdings International Ltd',
  }),
  row({
    id: '10000000-0000-4000-8000-000000000002',
    displayName: 'a@b.com',
    email: 'a@b.com',
  }),
  row({
    id: '10000000-0000-4000-8000-000000000003',
    displayName: '+447700900999',
    phoneE164: '+447700900999',
  }),
  row({
    id: '10000000-0000-4000-8000-000000000004',
    displayName: 'Unnamed contact',
  }),
];

const POPULATED_ROWS: ContactListRow[] = [
  row({
    id: '20000000-0000-4000-8000-000000000001',
    displayName: 'Oakfield Care Group',
    email: 'partnerships@oakfield.example.com',
    companyName: 'Oakfield Care Group',
    openDeal: {
      id: '30000000-0000-4000-8000-000000000001',
      name: '2026 shirt sponsorship',
      valuePence: 25_000_000,
      stageName: 'Proposal',
      status: 'open',
    },
  }),
  row({
    id: '20000000-0000-4000-8000-000000000002',
    displayName: 'Harbour View FC',
    email: 'commercial@harbour.example.com',
    companyName: 'Harbour View FC',
  }),
  row({
    id: '20000000-0000-4000-8000-000000000003',
    displayName: 'Meadowbank RFC',
    email: 'sponsorship@meadow.example.com',
    companyName: 'Meadowbank RFC',
  }),
];

export function contactsScenarioListPayload(
  scenario: ContactsDevScenario,
): { summary: ContactListSummary; list: ContactListResponse } {
  if (scenario === 'empty') {
    return {
      summary: {
        total: 0,
        addedThisWeek: 0,
        smartListCounts: {
          all: 0,
          mine: 0,
          new_week: 0,
          no_next_step: 0,
          dnd: 0,
        },
      },
      list: { rows: [], nextCursor: null, totalApprox: 0 },
    };
  }

  const rows = scenario === 'display-fallbacks' ? DISPLAY_FALLBACK_ROWS : POPULATED_ROWS;
  const total = rows.length;

  return {
    summary: {
      total,
      addedThisWeek: scenario === 'list-populated' ? 2 : 0,
      smartListCounts: {
        all: total,
        mine: total,
        new_week: scenario === 'list-populated' ? 2 : 0,
        no_next_step: 1,
        dnd: 0,
      },
    },
    list: {
      rows,
      nextCursor: null,
      totalApprox: total,
    },
  };
}
