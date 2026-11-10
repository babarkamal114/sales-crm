import type { Metadata } from 'next';
import { OpportunitiesPageClient } from '@/features/opportunities/opportunities-page-client';
import { requireSession } from '@/server/auth/require-session';
import { withTenant } from '@/server/db/with-tenant';
import {
  listAccessiblePipelines,
  listPipelineStages,
} from '@/server/services/opportunities/opportunity-board';
export const metadata: Metadata = { title: 'Opportunities' };

export default async function OpportunitiesPage() {
  const session = await requireSession();

  const [pipelines, defaultStageId] = await withTenant(session, async (tx) => {
    const pipelineRows = await listAccessiblePipelines(tx, session);
    const activePipeline =
      pipelineRows.find((row) => row.isDefault)?.id ?? pipelineRows[0]?.id ?? null;
    let firstOpenStageId: string | null = null;
    if (activePipeline) {
      const stages = await listPipelineStages(tx, session, activePipeline);
      firstOpenStageId = stages.find((stage) => stage.kind === 'open')?.id ?? null;
    }
    return [pipelineRows, firstOpenStageId] as const;
  });

  return (
    <OpportunitiesPageClient
      role={session.role}
      currentUserId={session.userId}
      initialPipelines={pipelines}
      defaultStageId={defaultStageId}
    />
  );
}
