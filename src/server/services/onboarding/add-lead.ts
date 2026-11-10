import 'server-only';

import { and, asc, eq } from 'drizzle-orm';
import { ONBOARDING_STEP } from '@/domain/onboarding/steps';
import { writeAudit } from '@/server/audit/write';
import {
  contact,
  opportunity,
  pipelineStage,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { provisionDefaultPipeline } from '@/server/services/pipeline/provision-default-pipeline';
import { markOnboardingStepComplete } from '@/server/services/onboarding/progress';
import { ensureConversationForContact } from '@/server/services/conversations/ensure-conversation-for-contact';

export type AddLeadInput = {
  displayName: string;
  email?: string;
  phoneE164?: string;
  title: string;
  valuePence?: number;
  marketingConsent: boolean;
};

export type AddLeadOptions = {
  /** When false, skips onboarding progress updates (bulk CSV import). */
  completeLeadsStep?: boolean;
};

export async function addLeadDuringOnboarding(
  tx: DbTransaction,
  session: TenantSession,
  input: AddLeadInput,
  options?: AddLeadOptions,
): Promise<string> {
  const { pipelineId } = await provisionDefaultPipeline(tx, session);

  const [firstStage] = await tx
    .select()
    .from(pipelineStage)
    .where(
      and(
        eq(pipelineStage.pipelineId, pipelineId),
        eq(pipelineStage.orgId, session.orgId),
      ),
    )
    .orderBy(asc(pipelineStage.position))
    .limit(1);

  if (!firstStage) {
    throw new Error('Default pipeline has no stages');
  }

  const now = new Date();
  const trimmedName = input.displayName.trim();
  const nameParts = trimmedName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? 'Contact';
  const lastName = nameParts.slice(1).join(' ');
  const emailNorm = input.email?.trim().toLowerCase() || null;

  const [createdContact] = await tx
    .insert(contact)
    .values({
      orgId: session.orgId,
      displayName: trimmedName,
      firstName,
      lastName,
      email: input.email ?? null,
      emailNormalised: emailNorm,
      phoneE164: input.phoneE164 ?? null,
      ownerId: session.userId,
      marketingConsent: input.marketingConsent,
      source: 'Manual',
      lastActivityAt: now,
      createdBy: session.userId,
      updatedBy: session.userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: contact.id });

  await ensureConversationForContact(tx, session, createdContact!.id);

  const [createdOpp] = await tx
    .insert(opportunity)
    .values({
      orgId: session.orgId,
      contactId: createdContact!.id,
      pipelineId,
      stageId: firstStage.id,
      name: input.title,
      status: 'open',
      valuePence: input.valuePence ?? null,
      position: 'n',
      stageEnteredAt: now,
      lastActivityAt: now,
      ownerId: session.userId,
      createdBy: session.userId,
      updatedBy: session.userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: opportunity.id });

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'onboarding.lead_added',
    entityType: 'opportunity',
    entityId: createdOpp!.id,
    changes: {
      contactId: { to: createdContact!.id },
      name: { to: input.title },
    },
  });

  if (options?.completeLeadsStep === false) {
    return createdOpp!.id;
  }

  return markOnboardingStepComplete(tx, session, ONBOARDING_STEP.leads);
}
