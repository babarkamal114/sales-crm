import { randomUUID } from 'node:crypto';
import { membership, organisation, user } from '@/server/db/schema';
import { provisionDefaultPipeline } from '@/server/services/pipeline/provision-default-pipeline';
import type { DbTransaction, TenantSession } from '@/server/db/with-tenant';
import {
  clearAuthOperation,
  setAuthOperation,
  setTenantContext,
} from '@/test/db/tenant-context';

export type OrgFixture = {
  orgId: string;
  pipelineId: string;
  admin: TenantSession;
  manager: TenantSession;
  member: TenantSession;
};

async function insertUser(
  tx: DbTransaction,
  email: string,
  fullName: string,
): Promise<string> {
  const [row] = await tx
    .insert(user)
    .values({
      email,
      fullName,
      emailVerifiedAt: new Date(),
    })
    .returning({ id: user.id });

  return row!.id;
}

/** One organisation with admin, manager, member, and a default pipeline (rolled-back tests). */
export async function createOrgFixture(
  tx: DbTransaction,
  label: string,
): Promise<OrgFixture> {
  const token = randomUUID().slice(0, 8);

  await setAuthOperation(tx, 'sign_up');

  const [org] = await tx
    .insert(organisation)
    .values({
      name: `Test org ${label}`,
      slug: `test-${label}-${token}`,
    })
    .returning({ id: organisation.id });

  if (!org) {
    throw new Error('Failed to create test organisation');
  }

  const adminUserId = await insertUser(tx, `admin.${token}@example.com`, 'Test Admin');
  const managerUserId = await insertUser(tx, `manager.${token}@example.com`, 'Test Manager');
  const memberUserId = await insertUser(tx, `member.${token}@example.com`, 'Test Member');

  await tx.insert(membership).values([
    { orgId: org.id, userId: adminUserId, role: 'admin' },
    { orgId: org.id, userId: managerUserId, role: 'manager' },
    { orgId: org.id, userId: memberUserId, role: 'member' },
  ]);

  await clearAuthOperation(tx);

  const admin: TenantSession = { orgId: org.id, userId: adminUserId, role: 'admin' };
  await setTenantContext(tx, admin);
  const { pipelineId } = await provisionDefaultPipeline(tx, admin);

  return {
    orgId: org.id,
    pipelineId,
    admin,
    manager: { orgId: org.id, userId: managerUserId, role: 'manager' },
    member: { orgId: org.id, userId: memberUserId, role: 'member' },
  };
}
