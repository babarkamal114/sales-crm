import type { HTMLAttributes } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Try again",
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 py-8",
        className,
      )}
      role="alert"
      {...props}
    >
      <h3 className="text-[17px] leading-[26px] font-semibold text-ink-900">
        {title}
      </h3>
      {description ? (
        <p className="text-[14px] leading-[22px] text-ink-500">{description}</p>
      ) : null}
      {onRetry ? (
        <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
