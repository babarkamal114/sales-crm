import { ContentPanel } from '@/components/layouts/app-header';
import { SkeletonBlock } from '@/components/ui/skeleton-patterns';

export default function OpportunitiesLoading() {
  return (
    <ContentPanel className="space-y-4 pb-28">
      <SkeletonBlock className="h-10 w-64" />
      <SkeletonBlock className="h-14 w-full" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-[420px] w-[288px] shrink-0" />
        ))}
      </div>
    </ContentPanel>
  );
}
