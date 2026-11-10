import { describe, expect, it } from 'vitest';
import { ForbiddenError } from '@/server/access/capabilities';
import {
  createSavedView,
  deleteSavedView,
  listSavedViews,
} from '@/server/services/opportunities/saved-views';
import { createOrgFixture } from '@/test/factories/org-fixture';
import { withRollbackTransaction } from '@/test/db/rollback-transaction';
import { setTenantContext } from '@/test/db/tenant-context';

const integrationEnabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!integrationEnabled)('saved views (integration)', () => {
  it('creates a team view visible to all pipeline members', async () => {
    await withRollbackTransaction(async (tx) => {
      const fixture = await createOrgFixture(tx, 'shared-list');

      await setTenantContext(tx, fixture.admin);
      const { id } = await createSavedView(tx, fixture.admin, {
        name: 'Team open deals',
        scope: 'board',
        pipelineId: fixture.pipelineId,
        filters: { owner: 'me' },
        shared: true,
      });

      await setTenantContext(tx, fixture.member);
      const memberViews = await listSavedViews(tx, fixture.member, fixture.pipelineId, 'board');
      const teamView = memberViews.find((view) => view.id === id);

      expect(teamView).toMatchObject({
        name: 'Team open deals',
        isShared: true,
        isMine: false,
        canDelete: false,
      });
    });
  });

  it('refuses when a member tries to create a team view', async () => {
    await withRollbackTransaction(async (tx) => {
      const fixture = await createOrgFixture(tx, 'member-shared');

      await setTenantContext(tx, fixture.member);
      await expect(
        createSavedView(tx, fixture.member, {
          name: 'Sneaky team view',
          scope: 'board',
          pipelineId: fixture.pipelineId,
          filters: {},
          shared: true,
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  it('lets managers delete team views but not members', async () => {
    await withRollbackTransaction(async (tx) => {
      const fixture = await createOrgFixture(tx, 'delete-shared');

      await setTenantContext(tx, fixture.admin);
      const { id } = await createSavedView(tx, fixture.admin, {
        name: 'Remove me',
        scope: 'list',
        pipelineId: fixture.pipelineId,
        filters: { q: 'x' },
        shared: true,
      });

      await setTenantContext(tx, fixture.member);
      await expect(deleteSavedView(tx, fixture.member, id)).rejects.toBeInstanceOf(
        ForbiddenError,
      );

      await setTenantContext(tx, fixture.manager);
      await deleteSavedView(tx, fixture.manager, id);

      const remaining = await listSavedViews(tx, fixture.manager, fixture.pipelineId, 'list');
      expect(remaining.some((view) => view.id === id)).toBe(false);
    });
  });

  it('does not list saved views from another organisation', async () => {
    await withRollbackTransaction(async (tx) => {
      const orgA = await createOrgFixture(tx, 'iso-a');
      const orgB = await createOrgFixture(tx, 'iso-b');

      await setTenantContext(tx, orgA.admin);
      await createSavedView(tx, orgA.admin, {
        name: 'Org A only',
        scope: 'board',
        pipelineId: orgA.pipelineId,
        filters: {},
        shared: true,
      });

      await setTenantContext(tx, orgB.admin);
      const orgBViews = await listSavedViews(tx, orgB.admin, orgB.pipelineId, 'board');

      expect(orgBViews.some((view) => view.name === 'Org A only')).toBe(false);
    });
  });
});
