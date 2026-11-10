import { NextResponse } from 'next/server';
import { dashboardScenarioSchema } from '@/domain/dashboard/schemas';
import { getActiveSession } from '@/server/auth/require-session';
import { getDashboardWelcome } from '@/server/services/dashboard/fixture-service';

export async function GET(request: Request) {
  const session = await getActiveSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  let scenario: ReturnType<typeof dashboardScenarioSchema.parse> | undefined;
  const scenarioParam = url.searchParams.get('scenario');
  if (scenarioParam) {
    const parsed = dashboardScenarioSchema.safeParse(scenarioParam);
    if (parsed.success) scenario = parsed.data;
  }

  return NextResponse.json(await getDashboardWelcome(session, scenario));
}
