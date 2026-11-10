import 'server-only';

import { sql } from 'drizzle-orm';
import type { DbTransaction } from '@/server/db/with-tenant';

export type WorkspaceSetupState = {
  pipeline: {
    exists: boolean;
    stageCount: number;
    name: string | null;
  };
  contacts: { count: number };
  team: {
    memberCount: number;
    pendingInvites: Array<{ email: string; role: string; expiresAt: Date }>;
  };
};

export async function loadWorkspaceSetupState(
  tx: DbTransaction,
  orgId: string,
): Promise<WorkspaceSetupState> {
  const pipelineResult = await tx.execute<{
    exists: boolean;
    stage_count: number;
    name: string | null;
  }>(sql`
    SELECT
      EXISTS (
        SELECT 1 FROM crm.pipeline p
        WHERE p.org_id = ${orgId}::uuid AND p.is_default = true
      ) AS exists,
      (
        SELECT count(*)::int FROM crm.pipeline_stage ps
        INNER JOIN crm.pipeline p ON p.id = ps.pipeline_id
        WHERE p.org_id = ${orgId}::uuid AND p.is_default = true
      ) AS stage_count,
      (
        SELECT p.name FROM crm.pipeline p
        WHERE p.org_id = ${orgId}::uuid AND p.is_default = true
        LIMIT 1
      ) AS name
  `);

  const contactResult = await tx.execute<{ count: number }>(sql`
    SELECT count(*)::int AS count FROM crm.contact WHERE org_id = ${orgId}::uuid
  `);

  const teamResult = await tx.execute<{
    member_count: number;
  }>(sql`
    SELECT count(*)::int AS member_count
    FROM crm.membership m
    INNER JOIN crm."user" u ON u.id = m.user_id
    WHERE m.org_id = ${orgId}::uuid AND u.deleted_at IS NULL
  `);

  const invitesResult = await tx.execute<{
    email: string;
    role: string;
    expires_at: Date;
  }>(sql`
    SELECT email, role, expires_at
    FROM crm.member_invitation
    WHERE org_id = ${orgId}::uuid AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 20
  `);

  const pipe = pipelineResult[0];
  return {
    pipeline: {
      exists: Boolean(pipe?.exists),
      stageCount: pipe?.stage_count ?? 0,
      name: pipe?.name ?? null,
    },
    contacts: { count: contactResult[0]?.count ?? 0 },
    team: {
      memberCount: teamResult[0]?.member_count ?? 0,
      pendingInvites: invitesResult.map((row) => ({
        email: row.email,
        role: row.role,
        expiresAt: new Date(row.expires_at),
      })),
    },
  };
}
