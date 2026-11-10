import 'server-only';

import { and, eq } from 'drizzle-orm';
import {
  OUTREACH_SEQUENCES,
  outreachSequenceForLifecycle,
  type OutreachSequenceDefinition,
} from '@/domain/contacts/email-outreach-sequences';
import {
  defaultStepKeyForSequence,
  isSystemOutreachSequenceKey,
  normaliseOutreachSequenceKey,
} from '@/domain/contacts/outreach-sequence-keys';
import type { OrgOutreachSequenceSteps } from '@/domain/contacts/outreach-sequence-schemas';
import type { OrgOutreachSequenceView } from '@/domain/contacts/outreach-sequence-view';
import { assertCan } from '@/server/access/capabilities';
import { orgOutreachSequence } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { upsertContactEmailTemplate } from '@/server/services/contacts/contact-email-templates';

function definitionFromRow(
  sequenceKey: string,
  label: string,
  steps: unknown,
): OutreachSequenceDefinition {
  const parsed = steps as OrgOutreachSequenceSteps;
  return {
    key: sequenceKey,
    label,
    lifecycle: '',
    steps: parsed,
  };
}

function rowToView(row: typeof orgOutreachSequence.$inferSelect): OrgOutreachSequenceView {
  return {
    sequenceKey: row.sequenceKey,
    label: row.label,
    steps: row.steps as OrgOutreachSequenceSteps,
    isCustomised: true,
    isUserCreated: !isSystemOutreachSequenceKey(row.sequenceKey),
  };
}

export async function resolveOutreachSequenceByKey(
  tx: DbTransaction,
  session: TenantSession,
  sequenceKey: string,
): Promise<OutreachSequenceDefinition> {
  const [custom] = await tx
    .select()
    .from(orgOutreachSequence)
    .where(
      and(
        eq(orgOutreachSequence.orgId, session.orgId),
        eq(orgOutreachSequence.sequenceKey, sequenceKey),
      ),
    )
    .limit(1);

  if (custom) {
    return definitionFromRow(custom.sequenceKey, custom.label, custom.steps);
  }

  const fallback = OUTREACH_SEQUENCES.find((s) => s.key === sequenceKey);
  if (!fallback) {
    throw new Error('Unknown sequence.');
  }

  return fallback;
}

export async function listOrgOutreachSequences(
  tx: DbTransaction,
  session: TenantSession,
): Promise<OrgOutreachSequenceView[]> {
  assertCan(session, 'contact.view');

  const rows = await tx
    .select()
    .from(orgOutreachSequence)
    .where(eq(orgOutreachSequence.orgId, session.orgId));

  const byKey = new Map(rows.map((r) => [r.sequenceKey, r]));

  const systemViews: OrgOutreachSequenceView[] = OUTREACH_SEQUENCES.map((def) => {
    const custom = byKey.get(def.key);
    if (custom) {
      return {
        sequenceKey: custom.sequenceKey,
        label: custom.label,
        steps: custom.steps as OrgOutreachSequenceSteps,
        isCustomised: true,
        isUserCreated: false,
      };
    }
    return {
      sequenceKey: def.key,
      label: def.label,
      steps: def.steps,
      isCustomised: false,
      isUserCreated: false,
    };
  });

  const userCreated = rows
    .filter((row) => !isSystemOutreachSequenceKey(row.sequenceKey))
    .map(rowToView)
    .sort((a, b) => a.label.localeCompare(b.label));

  return [...systemViews, ...userCreated];
}

async function orgSequenceKeyExists(
  tx: DbTransaction,
  orgId: string,
  sequenceKey: string,
): Promise<boolean> {
  const [row] = await tx
    .select({ id: orgOutreachSequence.id })
    .from(orgOutreachSequence)
    .where(
      and(
        eq(orgOutreachSequence.orgId, orgId),
        eq(orgOutreachSequence.sequenceKey, sequenceKey),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function createOrgOutreachSequence(
  tx: DbTransaction,
  session: TenantSession,
  input: { label: string },
): Promise<OrgOutreachSequenceView> {
  assertCan(session, 'contact.update');

  const label = input.label.trim();
  let sequenceKey = normaliseOutreachSequenceKey(label);
  if (isSystemOutreachSequenceKey(sequenceKey)) {
    sequenceKey = `${sequenceKey}_custom`.slice(0, 48);
  }

  let suffix = 2;
  while (await orgSequenceKeyExists(tx, session.orgId, sequenceKey)) {
    sequenceKey = `${normaliseOutreachSequenceKey(label).slice(0, 42)}_${suffix}`;
    suffix += 1;
  }

  const firstStepKey = defaultStepKeyForSequence(sequenceKey, 0);
  const steps: OrgOutreachSequenceSteps = [
    {
      stepKey: firstStepKey,
      label: 'First email',
      daysAfterPrevious: 0,
      reminderTitle: `Send ${label} — step 1`,
    },
  ];

  const now = new Date();
  await tx.insert(orgOutreachSequence).values({
    orgId: session.orgId,
    sequenceKey,
    label,
    steps,
    createdAt: now,
    updatedAt: now,
  });

  await upsertContactEmailTemplate(tx, session, {
    stepKey: firstStepKey,
    name: `${label} — step 1`,
    subject: 'Message from {{org_name}}',
    bodyHtml: `<p>Hi {{first_name}},</p>\n<p>Your message here.</p>\n<p>Best,<br>{{sender_name}}</p>`,
  });

  return {
    sequenceKey,
    label,
    steps,
    isCustomised: true,
    isUserCreated: true,
  };
}

export async function upsertOrgOutreachSequence(
  tx: DbTransaction,
  session: TenantSession,
  input: { sequenceKey: string; label: string; steps: OrgOutreachSequenceSteps },
): Promise<OrgOutreachSequenceView> {
  assertCan(session, 'contact.update');

  const isSystem = isSystemOutreachSequenceKey(input.sequenceKey);
  const [existing] = await tx
    .select({ id: orgOutreachSequence.id })
    .from(orgOutreachSequence)
    .where(
      and(
        eq(orgOutreachSequence.orgId, session.orgId),
        eq(orgOutreachSequence.sequenceKey, input.sequenceKey),
      ),
    )
    .limit(1);

  if (!isSystem && !existing) {
    throw new Error('Sequence not found.');
  }

  const now = new Date();

  if (existing) {
    await tx
      .update(orgOutreachSequence)
      .set({
        label: input.label.trim(),
        steps: input.steps,
        updatedAt: now,
      })
      .where(eq(orgOutreachSequence.id, existing.id));
  } else {
    await tx.insert(orgOutreachSequence).values({
      orgId: session.orgId,
      sequenceKey: input.sequenceKey,
      label: input.label.trim(),
      steps: input.steps,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    sequenceKey: input.sequenceKey,
    label: input.label.trim(),
    steps: input.steps,
    isCustomised: true,
    isUserCreated: !isSystem,
  };
}

export async function deleteOrgOutreachSequence(
  tx: DbTransaction,
  session: TenantSession,
  sequenceKey: string,
): Promise<void> {
  assertCan(session, 'contact.update');

  if (isSystemOutreachSequenceKey(sequenceKey)) {
    throw new Error('Built-in sequences cannot be deleted.');
  }

  await tx
    .delete(orgOutreachSequence)
    .where(
      and(
        eq(orgOutreachSequence.orgId, session.orgId),
        eq(orgOutreachSequence.sequenceKey, sequenceKey),
      ),
    );
}

export async function resolveOutreachSequenceForContact(
  tx: DbTransaction,
  session: TenantSession,
  lifecycle: string,
): Promise<OutreachSequenceDefinition> {
  const fallback = outreachSequenceForLifecycle(lifecycle);

  const [custom] = await tx
    .select()
    .from(orgOutreachSequence)
    .where(
      and(
        eq(orgOutreachSequence.orgId, session.orgId),
        eq(orgOutreachSequence.sequenceKey, fallback.key),
      ),
    )
    .limit(1);

  if (!custom) {
    return fallback;
  }

  return definitionFromRow(custom.sequenceKey, custom.label, custom.steps);
}
