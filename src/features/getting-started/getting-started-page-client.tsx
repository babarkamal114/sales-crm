'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ContentPanel } from '@/components/layouts/app-header';
import { toast } from '@/components/ui/sonner';
import type { DashboardWelcomeResponse } from '@/domain/dashboard/types';
import { CrmGettingStartedHero } from '@/features/getting-started/components/crm-getting-started-hero';
import { GettingStartedRail } from '@/features/getting-started/components/getting-started-rail';
import { WelcomeChecklist } from '@/features/dashboard/welcome/welcome-checklist';
import { fetchDashboardWelcome } from '@/features/dashboard/lib/api';
import { dashboardKeys } from '@/features/dashboard/query-keys';
import type { CrmRole } from '@/server/db/schema';

export function GettingStartedPageClient({
  fullName,
  role,
  initialWelcome,
  scenario,
}: {
  fullName: string;
  role: CrmRole;
  initialWelcome: DashboardWelcomeResponse;
  scenario?: string;
}) {
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: welcome, refetch } = useQuery({
    queryKey: dashboardKeys.welcome(scenario),
    queryFn: () => fetchDashboardWelcome(scenario),
    initialData: initialWelcome,
  });

  const data = welcome ?? initialWelcome;

  useEffect(() => {
    const first = data.checklist.find((item) => !item.done && item.inlineSetup)?.id;
    if (first && expandedId === null) {
      setExpandedId(first);
    }
  }, [data.checklist, expandedId]);

  useEffect(() => {
    const integration = searchParams.get('integration');
    if (integration === 'connected') {
      toast.success('Integration connected');
    } else if (integration === 'failed') {
      toast.error('Could not connect integration');
    } else if (integration === 'not_configured') {
      toast.message('Integration not configured', {
        description: 'Add the required API keys in your environment.',
      });
    }
  }, [searchParams]);

  return (
    <ContentPanel className="space-y-8 pb-28">
      <CrmGettingStartedHero fullName={fullName} welcome={data} />

      {data.showWelcome ? (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_300px] xl:gap-10">
          <section aria-label="Setup steps">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[17px] font-extrabold tracking-tight text-ink-900">
                  Your setup steps
                </h2>
                <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-ink-500">
                  Expand a step, complete it here, and we&apos;ll open the next one for you.
                </p>
              </div>
              {data.progress ? (
                <span className="hidden shrink-0 rounded-full bg-brand-50 px-3 py-1 text-[12px] font-bold text-brand-700 sm:inline">
                  {data.progress.completed}/{data.progress.total}
                </span>
              ) : null}
            </div>
            <WelcomeChecklist
              items={data.checklist}
              role={role}
              expandedId={expandedId}
              onExpandedChange={setExpandedId}
              onStepComplete={() => {
                toast.success('Step complete', {
                  description: 'Opening the next setup step for you.',
                });
                void refetch();
              }}
            />
          </section>

          <GettingStartedRail
            items={data.checklist}
            expandedId={expandedId}
            onSelectStep={(id) => {
              setExpandedId(id);
              document.getElementById(`setup-step-${id}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
              });
            }}
            {...(data.progress ? { progress: data.progress } : {})}
          />
        </div>
      ) : (
        <div className="rounded-xl2 border border-mint-200 bg-gradient-to-br from-mint-50/90 to-white px-6 py-6 shadow-panel">
          <p className="text-[17px] font-extrabold text-mint-800">Setup complete</p>
          <p className="mt-1 max-w-lg text-[13.5px] font-medium text-mint-700/90">
            Your CRM workspace is configured. Use the dashboard for pipeline, tasks, and team
            activity.
          </p>
        </div>
      )}

      <p className="text-center text-[11px] font-medium text-ink-400">
        Return anytime via <span className="font-semibold text-brand-600">Getting started</span> in
        the sidebar.
      </p>
    </ContentPanel>
  );
}
