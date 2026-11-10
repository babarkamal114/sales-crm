'use client';

import { SkeletonBlock, SkeletonLine } from '@/components/ui/skeleton-patterns';
import { ContentPanel } from '@/components/layouts/app-header';

export function DashboardPageSkeleton() {
  return (
    <ContentPanel className="space-y-5 pb-28" aria-busy aria-label="Loading dashboard">
      <div className="space-y-2">
        <SkeletonLine width="w-48" className="h-7 rounded-xl" />
        <SkeletonLine width="w-64" />
      </div>
      <SkeletonBlock className="h-10 w-full max-w-xl rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonBlock key={i} className="h-28 rounded-xl2" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.7fr_1fr]">
        <SkeletonBlock className="h-72 rounded-xl2" />
        <SkeletonBlock className="h-72 rounded-xl2" />
      </div>
    </ContentPanel>
  );
}
