import { AlertCircle } from "lucide-react";
import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface AlertBannerProps extends HTMLAttributes<HTMLDivElement> {
  message: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function AlertBanner({
  message,
  actionLabel,
  onAction,
  className,
  ...props
}: AlertBannerProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3.5",
        className,
      )}
      role="alert"
      {...props}
    >
      <AlertCircle
        className="size-4 shrink-0 text-rose-600"
        strokeWidth={2}
        aria-hidden
      />
      <p className="min-w-[220px] flex-1 text-[12.5px] font-medium text-rose-600">
        {message}
      </p>
      {actionLabel ? (
        <Button
          variant="dark"
          size="sm"
          className="h-8 rounded-lg bg-rose-600 px-3 text-[12.5px] hover:bg-rose-600/90"
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
