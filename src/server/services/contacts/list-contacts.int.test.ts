import { describe, expect, it } from 'vitest';
import { createContact } from '@/server/services/contacts/create-contact';
import { listContacts } from '@/server/services/contacts/list-contacts';
import { createOrgFixture } from '@/test/factories/org-fixture';
import { withRollbackTransaction } from '@/test/db/rollback-transaction';
import { setTenantContext } from '@/test/db/tenant-context';

const integrationEnabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!integrationEnabled)('listContacts (integration)', () => {
  it('returns only visible contacts for a member (C2)', async () => {
    await withRollbackTransaction(async (tx) => {
      const fixture = await createOrgFixture(tx, 'list-member');

      await setTenantContext(tx, fixture.admin);
      await createContact(tx, fixture.admin, {
        firstName: 'Admin',
        lastName: 'Owned',
        email: 'admin.owned@example.com',
        ownerId: fixture.admin.userId,
      });

      await setTenantContext(tx, fixture.member);
      const { id: memberContactId } = await createContact(tx, fixture.member, {
        firstName: 'Member',
        lastName: 'Owned',
        email: 'member.owned@example.com',
        ownerId: fixture.member.userId,
      });

      const list = await listContacts(tx, fixture.member, {
        list: 'all',
        owner: 'all',
        sort: 'last_activity',
        dir: 'desc',
        limit: 50,
      });

      expect(list.rows.some((row) => row.id === memberContactId)).toBe(true);
      expect(list.rows.some((row) => row.email === 'admin.owned@example.com')).toBe(false);
    });
  });
});
