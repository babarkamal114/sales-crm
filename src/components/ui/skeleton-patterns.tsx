import { cn } from "@/lib/utils";
import { Skeleton } from "./feedback";

export function SkeletonLine({
  className,
  width = "w-full",
}: {
  className?: string;
  width?: string;
}) {
  return <Skeleton className={cn("h-2.5 rounded-lg", width, className)} />;
}

export function SkeletonBlock({
  className,
}: {
  className?: string;
}) {
  return <Skeleton className={cn("rounded-2xl", className)} />;
}

export function SkeletonCircle({
  className,
  size = "size-9",
}: {
  className?: string;
  size?: string;
}) {
  return <Skeleton className={cn("rounded-full", size, className)} />;
}

export function SkeletonBreadcrumb({ items = 2 }: { items?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-hidden>
      {Array.from({ length: items }, (_, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 ? <SkeletonLine width="w-2" className="h-2" /> : null}
          <SkeletonLine width={index === items - 1 ? "w-24" : "w-14"} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPillTabs({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2" aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonBlock
          key={index}
          className={cn("h-9", index === 0 ? "w-24" : "w-20")}
        />
      ))}
    </div>
  );
}

export function SkeletonPageHeader({
  withAvatar = false,
  withActions = false,
}: {
  withAvatar?: boolean;
  withActions?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4",
        withAvatar ? "mt-4" : "mt-1",
      )}
      aria-hidden
    >
      <div className="flex min-w-0 items-start gap-4">
        {withAvatar ? <SkeletonBlock className="size-14 rounded-2xl" /> : null}
        <div className="min-w-0 space-y-2.5 pt-1">
          <SkeletonLine width="w-48 sm:w-56" className="h-6 rounded-xl" />
          <SkeletonLine width="w-36 sm:w-44" />
          {withAvatar ? (
            <div className="flex gap-2 pt-1">
              <SkeletonBlock className="h-6 w-24 rounded-full" />
              <SkeletonBlock className="h-6 w-28 rounded-full" />
            </div>
          ) : null}
        </div>
      </div>
      {withActions ? (
        <div className="flex gap-2">
          <SkeletonBlock className="h-10 w-28 rounded-2xl" />
          <SkeletonBlock className="h-10 w-32 rounded-2xl" />
        </div>
      ) : null}
    </div>
  );
}

export function SkeletonSummaryChips({ count = 4 }: { count?: number }) {
  return (
    <div className="mt-5 flex flex-wrap gap-2" aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonBlock
          key={index}
          className={cn("h-10 rounded-2xl", index === 0 ? "w-28" : "w-24")}
        />
      ))}
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-line" aria-hidden>
      <div className="grid gap-3 border-b border-line bg-soft/40 px-4 py-3 sm:grid-cols-[1.4fr_1fr_1fr_0.8fr]">
        {Array.from({ length: columns }, (_, index) => (
          <SkeletonLine key={index} width={index === 0 ? "w-20" : "w-16"} />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid items-center gap-3 px-4 py-4 sm:grid-cols-[1.4fr_1fr_1fr_0.8fr]"
          >
            <div className="flex items-center gap-3">
              <SkeletonCircle size="size-9" />
              <div className="flex-1 space-y-2">
                <SkeletonLine width="w-32" />
                <SkeletonLine width="w-24" className="h-2" />
              </div>
            </div>
            {Array.from({ length: columns - 1 }, (_, colIndex) => (
              <SkeletonLine key={colIndex} width="w-20" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCardGrid({
  count = 3,
  columns = 3,
}: {
  count?: number;
  columns?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        "mt-5 grid gap-3",
        columns === 3 ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2",
      )}
      aria-hidden
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="space-y-3 rounded-2xl border border-line bg-white p-4"
        >
          <SkeletonLine width="w-24" className="h-2" />
          <SkeletonLine width="w-20" className="h-5 rounded-lg" />
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonProfileMenuTrigger({
  variant = "bar",
  className,
}: {
  variant?: "bar" | "floating";
  className?: string;
}) {
  const isBar = variant === "bar";

  return (
    <div
      aria-hidden
      className={cn(
        "flex h-11 max-w-[220px] items-center gap-2.5 rounded-2xl border pr-2.5 pl-1.5 sm:pr-3",
        isBar
          ? "border-white/90 bg-white/80 shadow-panel backdrop-blur-md"
          : "border-white bg-white shadow-panel",
        className,
      )}
    >
      <SkeletonBlock className="size-8 rounded-xl" />
      <span className="hidden min-w-0 flex-1 space-y-1.5 sm:block">
        <SkeletonLine width="w-24" className="h-2.5" />
        <SkeletonLine width="w-16" className="h-2" />
      </span>
      <SkeletonBlock className="size-4 rounded-md" />
    </div>
  );
}

export function SkeletonProfileMenuPanel() {
  return (
    <div className="w-[320px] p-0" aria-hidden>
      <div className="border-b border-line px-4 py-3.5">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="size-11 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonLine width="w-32" className="h-3 rounded-lg" />
            <SkeletonLine width="w-40" className="h-2" />
          </div>
        </div>
        <SkeletonBlock className="mt-3 h-6 w-24 rounded-full" />
      </div>
      <div className="space-y-1 p-2">
        <SkeletonLine width="w-16" className="mx-2 h-2" />
        {Array.from({ length: 3 }, (_, index) => (
          <SkeletonBlock key={index} className="mx-1 h-9 rounded-xl2" />
        ))}
      </div>
      <div className="space-y-1 border-t border-line p-2">
        <SkeletonLine width="w-20" className="mx-2 h-2" />
        <SkeletonBlock className="mx-1 h-11 rounded-xl2" />
      </div>
    </div>
  );
}

export function SkeletonOnboardingPage() {
  return (
    <div className="flex h-dvh flex-col bg-soft" aria-hidden>
      <div className="flex shrink-0 items-center justify-between border-b border-line/60 bg-white/70 px-5 py-4 sm:px-8">
        <SkeletonBlock className="h-8 w-32 rounded-xl" />
        <SkeletonLine width="w-20" />
      </div>
      <div className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-6 sm:px-8 sm:py-8">
        <div className="mb-5 rounded-xl2 bg-brand-100/40 p-6">
          <SkeletonLine width="w-56" className="h-6 rounded-xl" />
          <SkeletonLine width="w-full max-w-xl" className="mt-3" />
          <SkeletonBlock className="mt-5 h-3 w-full rounded-full" />
        </div>
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <div className="rounded-xl2 border border-white bg-white p-5 shadow-panel">
              <SkeletonBlock className="h-2 w-full rounded-full" />
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <SkeletonBlock key={index} className="h-12 rounded-xl" />
                ))}
              </div>
            </div>
            <div className="rounded-xl2 border border-white bg-white p-6 shadow-panel sm:p-8">
              <SkeletonLine width="w-48" className="h-6 rounded-xl" />
              <SkeletonLine width="w-full max-w-lg" className="mt-3" />
              <div className="mt-8 space-y-4">
                <SkeletonBlock className="h-12 w-full rounded-2xl" />
                <SkeletonBlock className="h-12 w-full rounded-2xl" />
                <SkeletonBlock className="h-32 w-full rounded-2xl" />
              </div>
            </div>
          </div>
          <div className="rounded-xl2 border border-white bg-white p-5 shadow-panel">
            <SkeletonLine width="w-28" className="h-4 rounded-lg" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }, (_, index) => (
                <SkeletonBlock key={index} className="h-14 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonGettingStartedPage() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]" aria-hidden>
      <div className="space-y-5">
        <div className="rounded-xl3 border border-white bg-white/70 p-6 shadow-panel">
          <SkeletonLine width="w-40" className="h-6 rounded-xl" />
          <SkeletonLine width="w-full max-w-xl" className="mt-3" />
          <SkeletonBlock className="mt-5 h-3 w-full rounded-full" />
          <SkeletonLine width="w-28" className="mt-3" />
        </div>
        {Array.from({ length: 2 }, (_, sectionIndex) => (
          <div
            key={sectionIndex}
            className="rounded-xl3 border border-white bg-white/70 p-6 shadow-panel"
          >
            <SkeletonLine width="w-32" className="h-4 rounded-lg" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }, (_, rowIndex) => (
                <SkeletonBlock key={rowIndex} className="h-16 rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl3 border border-white bg-white/70 p-5 shadow-panel">
        <SkeletonLine width="w-28" className="h-4 rounded-lg" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonBlock key={index} className="h-10 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
