import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';
import { deriveLifecycle } from '@/domain/companies/lifecycle';
import { lifecycleAfter } from '@/domain/contacts/lifecycle';
import { company, contact, opportunity } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import { writeAudit } from '@/server/audit/write';

type CloseStatus = 'won' | 'lost' | 'open';

/** Updates contact and company lifecycle when a deal status changes (derived only). */
export async function syncLifecycleOnOpportunityStatusChange(
  tx: DbTransaction,
  session: TenantSession,
  input: {
    contactId: string;
    companyId: string | null;
    previousStatus: CloseStatus | string;
    nextStatus: CloseStatus | string;
  },
): Promise<void> {
  if (input.previousStatus === input.nextStatus) return;

  const [c] = await tx
    .select({
      id: contact.id,
      lifecycle: contact.lifecycle,
    })
    .from(contact)
    .where(and(eq(contact.orgId, session.orgId), eq(contact.id, input.contactId)))
    .limit(1);

  if (c && input.nextStatus === 'won') {
    const next = lifecycleAfter(c.lifecycle, { type: 'opportunity_won' });
    if (next !== c.lifecycle) {
      await tx
        .update(contact)
        .set({ lifecycle: next, updatedAt: new Date(), updatedBy: session.userId })
        .where(eq(contact.id, c.id));
      await writeAudit(tx, {
        orgId: session.orgId,
        actorType: 'user',
        actorId: session.userId,
        action: 'contact.updated',
        entityType: 'contact',
        entityId: c.id,
        changes: { lifecycle: { from: c.lifecycle, to: next }, reason: { to: 'opportunity_won' } },
      });
    }
  }

  if (!input.companyId) return;

  const [co] = await tx
    .select({
      id: company.id,
      lifecycle: company.lifecycle,
      lifecycleSource: company.lifecycleSource,
    })
    .from(company)
    .where(and(eq(company.orgId, session.orgId), eq(company.id, input.companyId)))
    .limit(1);

  if (!co) return;

  const dealRows = await tx
    .select({ status: opportunity.status })
    .from(opportunity)
    .where(
      and(
        eq(opportunity.orgId, session.orgId),
        eq(opportunity.companyId, input.companyId),
        isNull(opportunity.deletedAt),
      ),
    );

  const nextCompanyLifecycle = deriveLifecycle(
    dealRows.map((d) => ({ status: d.status })),
    co.lifecycle,
    co.lifecycleSource,
  );

  if (nextCompanyLifecycle !== co.lifecycle) {
    await tx
      .update(company)
      .set({
        lifecycle: nextCompanyLifecycle,
        updatedAt: new Date(),
        updatedBy: session.userId,
      })
      .where(eq(company.id, co.id));
    await writeAudit(tx, {
      orgId: session.orgId,
      actorType: 'user',
      actorId: session.userId,
      action: 'company.updated',
      entityType: 'company',
      entityId: co.id,
      changes: {
        lifecycle: { from: co.lifecycle, to: nextCompanyLifecycle },
        reason: { to: 'opportunity_status_change' },
      },
    });
  }
}
