import { type HTMLAttributes } from "react";
import { statusToneStyles, type StatusTone } from "@/lib/tokens";
import { cn } from "@/lib/utils";

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone;
  showDot?: boolean;
}

export function StatusBadge({
  tone,
  showDot = true,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const styles = statusToneStyles[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
        styles.badge,
        className,
      )}
      {...props}
    >
      {showDot ? (
        <span className={cn("size-1.5 rounded-full", styles.dot)} />
      ) : null}
      {children}
    </span>
  );
}
