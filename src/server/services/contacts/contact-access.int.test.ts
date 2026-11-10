import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '@/server/access/capabilities';
import { opportunity, pipelineStage } from '@/server/db/schema';
import { createContact } from '@/server/services/contacts/create-contact';
import { requireContactView } from '@/server/services/contacts/contact-access';
import { createOrgFixture } from '@/test/factories/org-fixture';
import { withRollbackTransaction } from '@/test/db/rollback-transaction';
import { setTenantContext } from '@/test/db/tenant-context';

const integrationEnabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!integrationEnabled)('contact access (integration)', () => {
  it('hides another users contact from a member without a deal link', async () => {
    await withRollbackTransaction(async (tx) => {
      const fixture = await createOrgFixture(tx, 'contact-rls');

      await setTenantContext(tx, fixture.admin);
      const { id: contactId } = await createContact(tx, fixture.admin, {
        firstName: 'Hidden',
        lastName: 'Lead',
        email: 'hidden.lead@example.com',
        ownerId: fixture.admin.userId,
      });

      await setTenantContext(tx, fixture.member);
      await expect(
        requireContactView(tx, fixture.member, contactId),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  it('lets a member see a contact with an open deal on their pipeline', async () => {
    await withRollbackTransaction(async (tx) => {
      const fixture = await createOrgFixture(tx, 'contact-deal');

      await setTenantContext(tx, fixture.admin);
      const { id: contactId } = await createContact(tx, fixture.admin, {
        firstName: 'Pipeline',
        lastName: 'Lead',
        email: 'pipeline.lead@example.com',
        ownerId: fixture.admin.userId,
      });

      const [stage] = await tx
        .select({ id: pipelineStage.id })
        .from(pipelineStage)
        .where(eq(pipelineStage.pipelineId, fixture.pipelineId))
        .limit(1);

      await tx.insert(opportunity).values({
        orgId: fixture.orgId,
        contactId,
        pipelineId: fixture.pipelineId,
        stageId: stage!.id,
        name: 'Linked deal',
        valuePence: 0,
        currency: 'GBP',
        status: 'open',
        ownerId: fixture.admin.userId,
        position: 'a0',
        version: 1,
        createdBy: fixture.admin.userId,
        updatedBy: fixture.admin.userId,
      });

      await setTenantContext(tx, fixture.member);
      const row = await requireContactView(tx, fixture.member, contactId);
      expect(row.id).toBe(contactId);
    });
  });
});
