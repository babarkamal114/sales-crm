'use client';

import type { DashboardFiltersInput } from '@/domain/dashboard/schemas';
import { KpiCardsWidget } from '@/features/dashboard/widgets/kpi-cards-widget';
import { PipelineWidget } from '@/features/dashboard/widgets/pipeline-widget';
import { TasksWidget } from '@/features/dashboard/widgets/tasks-widget';
import { ConversationsWidget } from '@/features/dashboard/widgets/conversations-widget';
import { SourcesWidget } from '@/features/dashboard/widgets/sources-widget';
import { PaymentsWidget } from '@/features/dashboard/widgets/payments-widget';
import {
  ActivityWidget,
  NudgeCallout,
  TeamWidget,
} from '@/features/dashboard/widgets/activity-team-widgets';
import { NextCallPill } from '@/features/dashboard/widgets/next-call-pill';

export function DashboardMainGrid({
  filters,
  scenario,
  canUseTeamScope,
}: {
  filters: DashboardFiltersInput;
  scenario?: string;
  canUseTeamScope: boolean;
}) {
  const scenarioProps = scenario ? { scenario } : {};

  return (
    <>
      <div className="space-y-5">
        <KpiCardsWidget filters={filters} {...scenarioProps} />

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <PipelineWidget filters={filters} {...scenarioProps} />
          <TasksWidget filters={filters} {...scenarioProps} />
        </section>

        <section className="grid grid-cols-1 gap-5 min-[720px]:grid-cols-2 xl:grid-cols-3">
          <ConversationsWidget filters={filters} {...scenarioProps} />
          <SourcesWidget filters={filters} {...scenarioProps} />
          <div className="min-[720px]:max-[1279px]:col-span-2 xl:col-span-1">
            <PaymentsWidget filters={filters} {...scenarioProps} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <ActivityWidget filters={filters} {...scenarioProps} />
          <div>
            <TeamWidget
              filters={filters}
              {...scenarioProps}
              canViewTeam={canUseTeamScope}
            />
            <NudgeCallout filters={filters} {...scenarioProps} />
          </div>
        </section>
      </div>

      <NextCallPill filters={filters} {...scenarioProps} />
    </>
  );
}
