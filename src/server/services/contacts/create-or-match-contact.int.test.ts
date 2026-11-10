import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { contact } from '@/server/db/schema';
import { createContact } from '@/server/services/contacts/create-contact';
import { createOrMatchContact } from '@/server/services/contacts/create-or-match-contact';
import { createOrgFixture } from '@/test/factories/org-fixture';
import { withRollbackTransaction } from '@/test/db/rollback-transaction';
import { setTenantContext } from '@/test/db/tenant-context';

const integrationEnabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!integrationEnabled)('createOrMatchContact (integration)', () => {
  it('matches an existing contact by email without creating a duplicate (C16)', async () => {
    await withRollbackTransaction(async (tx) => {
      const fixture = await createOrgFixture(tx, 'inbound-match');

      await setTenantContext(tx, fixture.admin);
      const { id: existingId } = await createContact(tx, fixture.admin, {
        firstName: 'Existing',
        lastName: 'Lead',
        email: 'inbound.match@example.com',
        ownerId: fixture.admin.userId,
        source: 'Website',
      });

      const result = await createOrMatchContact(tx, fixture.admin, {
        firstName: 'Existing',
        lastName: 'Lead',
        email: 'inbound.match@example.com',
        source: 'Partner referral',
      });

      expect(result.created).toBe(false);
      expect(result.matchedBy).toBe('email');
      expect(result.id).toBe(existingId);

      const rows = await tx
        .select({ id: contact.id })
        .from(contact)
        .where(eq(contact.orgId, fixture.orgId));
      expect(rows).toHaveLength(1);
    });
  });
});
