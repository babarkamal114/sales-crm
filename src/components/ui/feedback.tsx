import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, "content"> {
  content: ReactNode;
}

/** Static tooltip surface — wrap with a positioning layer in the app when needed. */
export function Tooltip({ content, className, ...props }: TooltipProps) {
  return (
    <div
      className={cn(
        "inline-block max-w-[200px] rounded-xl bg-ink-900 p-3 text-[11.5px] leading-snug font-medium text-white shadow-float",
        className,
      )}
      role="tooltip"
      {...props}
    >
      {content}
    </div>
  );
}

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-white p-6 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mx-auto mb-2.5 flex size-11 items-center justify-center rounded-2xl bg-mint-50">
          {icon}
        </div>
      ) : null}
      <p className="text-[13px] font-bold">{title}</p>
      {description ? (
        <p className="mt-1 text-[11.5px] font-medium text-ink-500">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-full bg-soft", className)}
      aria-hidden
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-line bg-white p-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-2.5 w-2/3" />
          <Skeleton className="h-2 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-2.5" />
      <Skeleton className="h-2.5 w-4/5" />
    </div>
  );
}
