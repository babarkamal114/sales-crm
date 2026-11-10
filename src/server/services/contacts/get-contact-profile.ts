import 'server-only';

import { and, desc, eq, isNull } from 'drizzle-orm';
import type { ContactProfile } from '@/domain/contacts/profile-view';
import {
  attribution,
  contactFollower,
  opportunity,
  pipeline,
  pipelineStage,
  user,
} from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { requireContactView } from '@/server/services/contacts/contact-access';
import { getContactQuickView } from '@/server/services/contacts/get-contact-quick-view';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export type { ContactProfile };

export async function getContactProfile(
  tx: DbTransaction,
  session: TenantSession,
  contactId: string,
): Promise<ContactProfile> {
  const c = await requireContactView(tx, session, contactId);

  const [quickView, followerRows, opps, attributionRows] = await Promise.all([
    getContactQuickView(tx, session, contactId),
    tx
      .select({ id: user.id, fullName: user.fullName })
      .from(contactFollower)
      .innerJoin(user, eq(contactFollower.userId, user.id))
      .where(
        and(eq(contactFollower.orgId, session.orgId), eq(contactFollower.contactId, c.id)),
      ),
    tx
      .select({
        id: opportunity.id,
        name: opportunity.name,
        valuePence: opportunity.valuePence,
        status: opportunity.status,
        stageName: pipelineStage.name,
        pipelineId: pipeline.id,
        pipelineName: pipeline.name,
      })
      .from(opportunity)
      .innerJoin(pipelineStage, eq(opportunity.stageId, pipelineStage.id))
      .innerJoin(pipeline, eq(opportunity.pipelineId, pipeline.id))
      .where(
        and(
          eq(opportunity.orgId, session.orgId),
          eq(opportunity.contactId, c.id),
          isNull(opportunity.deletedAt),
        ),
      )
      .orderBy(desc(opportunity.updatedAt)),
    tx
      .select()
      .from(attribution)
      .where(and(eq(attribution.orgId, session.orgId), eq(attribution.contactId, c.id)))
      .orderBy(desc(attribution.capturedAt)),
  ]);

  return {
    ...quickView,
    firstName: c.firstName,
    lastName: c.lastName,
    lifecycle: c.lifecycle,
    campaign: c.campaign,
    socialUrl: c.socialUrl,
    recipientType: c.recipientType,
    phoneType: c.phoneType,
    followers: followerRows.map((row) => ({
      id: row.id,
      fullName: row.fullName?.trim() || 'User',
      initials: initials(row.fullName?.trim() || 'User'),
    })),
    opportunities: opps.map((deal) => ({
      id: deal.id,
      name: deal.name,
      valuePence: deal.valuePence,
      stageName: deal.stageName,
      status: deal.status,
      pipelineId: deal.pipelineId,
      pipelineName: deal.pipelineName,
    })),
    attribution: attributionRows.map((row) => ({
      touch: row.touch,
      source: row.source,
      medium: row.medium,
      campaign: row.campaign,
      form: row.form,
      pageUrl: row.pageUrl,
      capturedAt: row.capturedAt.toISOString(),
    })),
  };
}
