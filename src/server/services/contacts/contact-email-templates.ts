import 'server-only';

import { and, asc, eq, isNull } from 'drizzle-orm';
import type { upsertContactEmailTemplateSchema } from '@/domain/contacts/email-schemas';
import type { z } from 'zod';

type UpsertContactEmailTemplateInput = z.infer<typeof upsertContactEmailTemplateSchema>;
import {
  EMAIL_TEMPLATE_STEP_DEFS,
  stepLabelForKey,
} from '@/domain/contacts/email-template-steps';
import type { ContactEmailTemplateView } from '@/domain/contacts/email-template-view';
import { assertCan } from '@/server/access/capabilities';
import { writeAudit } from '@/server/audit/write';
import { contactEmailTemplate } from '@/server/db/schema';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';

function toView(row: typeof contactEmailTemplate.$inferSelect): ContactEmailTemplateView {
  return {
    id: row.id,
    stepKey: row.stepKey,
    stepLabel: stepLabelForKey(row.stepKey),
    name: row.name,
    subject: row.subject,
    bodyHtml: row.bodyHtml,
    sortOrder: row.sortOrder,
    isSystem: row.isSystem,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function ensureDefaultContactEmailTemplates(
  tx: DbTransaction,
  session: TenantSession,
): Promise<void> {
  const existing = await tx
    .select({ stepKey: contactEmailTemplate.stepKey })
    .from(contactEmailTemplate)
    .where(
      and(eq(contactEmailTemplate.orgId, session.orgId), isNull(contactEmailTemplate.deletedAt)),
    );

  const have = new Set(existing.map((r) => r.stepKey));
  const now = new Date();

  for (const def of EMAIL_TEMPLATE_STEP_DEFS) {
    if (have.has(def.key)) continue;
    await tx.insert(contactEmailTemplate).values({
      orgId: session.orgId,
      stepKey: def.key,
      name: def.label,
      subject: def.defaultSubject,
      bodyHtml: def.defaultBodyHtml,
      sortOrder: def.sortOrder,
      isSystem: true,
      createdBy: session.userId,
      updatedBy: session.userId,
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function listContactEmailTemplates(
  tx: DbTransaction,
  session: TenantSession,
): Promise<ContactEmailTemplateView[]> {
  assertCan(session, 'contact.view');
  await ensureDefaultContactEmailTemplates(tx, session);

  const rows = await tx
    .select()
    .from(contactEmailTemplate)
    .where(
      and(eq(contactEmailTemplate.orgId, session.orgId), isNull(contactEmailTemplate.deletedAt)),
    )
    .orderBy(asc(contactEmailTemplate.sortOrder), asc(contactEmailTemplate.name));

  return rows.map(toView);
}

export async function upsertContactEmailTemplate(
  tx: DbTransaction,
  session: TenantSession,
  input: UpsertContactEmailTemplateInput,
): Promise<ContactEmailTemplateView> {
  assertCan(session, 'contact.update');
  const now = new Date();

  if (input.templateId) {
    const [existing] = await tx
      .select()
      .from(contactEmailTemplate)
      .where(
        and(
          eq(contactEmailTemplate.orgId, session.orgId),
          eq(contactEmailTemplate.id, input.templateId),
          isNull(contactEmailTemplate.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new Error('Template not found.');
    }

    const [updated] = await tx
      .update(contactEmailTemplate)
      .set({
        stepKey: input.stepKey,
        name: input.name,
        subject: input.subject,
        bodyHtml: input.bodyHtml,
        version: existing.version + 1,
        updatedAt: now,
        updatedBy: session.userId,
      })
      .where(eq(contactEmailTemplate.id, existing.id))
      .returning();

    await writeAudit(tx, {
      orgId: session.orgId,
      actorType: 'user',
      actorId: session.userId,
      action: 'contact.email_template_updated',
      entityType: 'contact_email_template',
      entityId: updated!.id,
      changes: { stepKey: { to: input.stepKey }, name: { to: input.name } },
    });

    return toView(updated!);
  }

  const [created] = await tx
    .insert(contactEmailTemplate)
    .values({
      orgId: session.orgId,
      stepKey: input.stepKey,
      name: input.name,
      subject: input.subject,
      bodyHtml: input.bodyHtml,
      sortOrder: 900,
      isSystem: false,
      createdBy: session.userId,
      updatedBy: session.userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'contact.email_template_created',
    entityType: 'contact_email_template',
    entityId: created!.id,
    changes: { stepKey: { to: input.stepKey }, name: { to: input.name } },
  });

  return toView(created!);
}

export async function deleteContactEmailTemplate(
  tx: DbTransaction,
  session: TenantSession,
  templateId: string,
): Promise<void> {
  assertCan(session, 'contact.update');

  const [existing] = await tx
    .select()
    .from(contactEmailTemplate)
    .where(
      and(
        eq(contactEmailTemplate.orgId, session.orgId),
        eq(contactEmailTemplate.id, templateId),
        isNull(contactEmailTemplate.deletedAt),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new Error('Template not found.');
  }

  const now = new Date();
  await tx
    .update(contactEmailTemplate)
    .set({ deletedAt: now, updatedAt: now, updatedBy: session.userId })
    .where(eq(contactEmailTemplate.id, templateId));

  await writeAudit(tx, {
    orgId: session.orgId,
    actorType: 'user',
    actorId: session.userId,
    action: 'contact.email_template_deleted',
    entityType: 'contact_email_template',
    entityId: templateId,
    changes: { deletedAt: { to: now.toISOString() } },
  });
}
