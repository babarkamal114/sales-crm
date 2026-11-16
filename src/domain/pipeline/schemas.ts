import z from "zod";

export const managePipelineMembersSchema = z.object({
    pipelineId : z.string().uuid(),
    memberIds : z.array(z.string().uuid()),
})

export type ManagePipelineMembersInput = z.infer<typeof managePipelineMembersSchema>