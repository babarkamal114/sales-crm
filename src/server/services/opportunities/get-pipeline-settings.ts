'server-only'

import { NotFoundError } from "@/server/access/capabilities";
import { assertCanAccessPipeline } from "@/server/access/pipeline-access";
import { pipeline, pipelineMember, pipelineStage } from "@/server/db/schema";
import { DbTransaction, TenantSession } from "@/server/db/with-tenant";
import { and, asc, eq, isNull } from "drizzle-orm";

export async function getPipelineSettings(
    tx: DbTransaction,
    session: TenantSession,
    pipelineId : string
){
    await assertCanAccessPipeline(tx , session , pipelineId)

    const [pipelineDetails] = await tx.select({
        id : pipeline.id,
        name : pipeline.name,
        slug : pipeline.slug,
        color : pipeline.color,
        createdBy: pipeline.createdBy,
        position: pipeline.position,
        isDefault: pipeline.isDefault,
        version : pipeline.version
    }).from(pipeline).where(
        and(
            eq(pipeline.orgId, session.orgId),
            eq(pipeline.id, pipelineId),
            isNull(pipeline.archivedAt)
        ),
    ).limit(1)

    if (!pipelineDetails) {
        throw new NotFoundError('Pipeline not found')
    }

    const stages = await tx.select({
        id: pipelineStage.id,
        name: pipelineStage.name,
        kind: pipelineStage.kind,
        position: pipelineStage.position,
        probability: pipelineStage.probability,
        rottingDays: pipelineStage.rottingDays,
        version: pipelineStage.version,
    }).from(pipelineStage).where(
        and(
            eq(pipelineStage.orgId, session.orgId),
            eq(pipelineStage.pipelineId, pipelineId),
            isNull(pipelineStage.archivedAt)
        )
    ).orderBy(asc(pipelineStage.position))

    if (!stages) {
        throw new NotFoundError('Pipeline stages not found')
    }

    const members = await tx.select({
        id: pipelineMember.userId
    }).from(pipelineMember)
    .where(
        and(
            eq(pipelineMember.orgId, session.orgId),
            eq(pipelineMember.pipelineId , pipelineId)
        )
    )



    return {
        ...pipelineDetails,
        stages: stages,
        members: members
    }
}