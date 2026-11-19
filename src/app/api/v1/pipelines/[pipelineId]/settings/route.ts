import { handleApiError } from "@/server/api/json-error";
import { getActiveSession } from "@/server/auth/require-session";
import { withTenant } from "@/server/db/with-tenant";
import { getPipelineSettings } from "@/server/services/opportunities/get-pipeline-settings";
import { NextResponse } from "next/server";

type RouteContext = {params : Promise<{pipelineId : string}>}

export async function GET(_request: Request, context : RouteContext ){
    const session = await getActiveSession();
    if(!session){
        return NextResponse.json({
            error: 'Unauthenticated'
        },{
            status: 401
        })
    }
    const pipelineId = (await context.params).pipelineId
    try {
        const settings = await withTenant(session , (tx) => 
        getPipelineSettings(tx, session , pipelineId)
        )
        return NextResponse.json(
      { pipeline: settings },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
    } catch (error) {
        return handleApiError(error)
    }
}