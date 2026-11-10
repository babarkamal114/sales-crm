import type { Metadata } from 'next';
import { GettingStartedPageClient } from '@/features/getting-started/getting-started-page-client';
import { dashboardScenarioSchema } from '@/domain/dashboard/schemas';
import { requireSession } from '@/server/auth/require-session';
import { getDashboardWelcome } from '@/server/services/dashboard/fixture-service';

export const metadata: Metadata = { title: 'Getting started' };

export default async function GettingStartedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const rawScenario = params.scenario;
  const scenarioParam =
    typeof rawScenario === 'string' ? rawScenario : undefined;
  const scenario = scenarioParam
    ? dashboardScenarioSchema.safeParse(scenarioParam).data
    : undefined;

  const welcome = await getDashboardWelcome(session, scenario);

  return (
    <GettingStartedPageClient
      fullName={session.fullName}
      role={session.role}
      initialWelcome={welcome}
      {...(scenario ? { scenario } : {})}
    />
  );
}
