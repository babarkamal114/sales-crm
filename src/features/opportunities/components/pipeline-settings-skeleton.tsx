import { Skeleton } from '@/components/ui/feedback';
import { SkeletonBlock, SkeletonLine } from '@/components/ui/skeleton-patterns';

type SettingsSection = 'general' | 'stages' | 'members';

function GeneralSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonLine width="w-44" className="h-4" />
        <SkeletonLine width="w-64" />
      </div>
      {[0, 1].map((field) => (
        <div key={field} className="max-w-xl space-y-2">
          <SkeletonLine width="w-28" />
          <SkeletonBlock className="h-10 w-full rounded-xl" />
        </div>
      ))}
      <div className="space-y-3">
        <SkeletonLine width="w-32" />
        <div className="flex gap-3">
          {[0, 1, 2, 3, 4, 5].map((color) => (
            <Skeleton key={color} className="size-7" />
          ))}
        </div>
      </div>
      <SkeletonBlock className="h-20 w-full max-w-xl rounded-xl" />
    </div>
  );
}

function StagesSettingsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <SkeletonLine width="w-36" className="h-4" />
        <SkeletonLine width="w-72" />
      </div>
      {[0, 1, 2].map((stage) => (
        <div key={stage} className="space-y-4 rounded-xl border border-line p-4">
          <div className="flex items-center justify-between">
            <SkeletonLine width="w-16" />
            <SkeletonBlock className="h-8 w-24 rounded-lg" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((field) => (
              <div key={field} className="space-y-2">
                <SkeletonLine width="w-24" />
                <SkeletonBlock className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MembersSettingsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <SkeletonLine width="w-36" className="h-4" />
          <SkeletonLine width="w-64" />
        </div>
        <SkeletonBlock className="h-6 w-20 rounded-full" />
      </div>
      <SkeletonBlock className="h-10 w-full rounded-xl" />
      <div className="space-y-4 rounded-2xl border border-line p-4">
        {[0, 1, 2, 3].map((member) => (
          <div key={member} className="flex items-center gap-3">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="size-9" />
            <SkeletonLine width={member % 2 === 0 ? 'w-36' : 'w-28'} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PipelineSettingsSkeleton({ section }: { section: SettingsSection }) {
  return (
    <section
      role="status"
      aria-label={`Loading pipeline ${section} settings`}
    >
      <span className="sr-only">Loading pipeline {section} settings</span>
      {section === 'general' ? (
        <GeneralSettingsSkeleton />
      ) : section === 'stages' ? (
        <StagesSettingsSkeleton />
      ) : (
        <MembersSettingsSkeleton />
      )}
    </section>
  );
}
