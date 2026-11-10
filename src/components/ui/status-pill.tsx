import type { HTMLAttributes } from "react";
import type { StatusTone } from "@/lib/tokens";
import { StatusBadge } from "./status-badge";

/** CRM statuses mapped to design-system tones (rule 16). */
export const crmStatusToneMap: Record<string, StatusTone> = {
  Won: "clear",
  Paid: "clear",
  Delivered: "clear",
  Lost: "action",
  Overdue: "action",
  Failed: "action",
  DND: "action",
  "Due soon": "risk",
  Pending: "risk",
  Internal: "risk",
  Open: "brand",
};

export type CrmStatus = keyof typeof crmStatusToneMap;

export interface StatusPillProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  status: string;
  showDot?: boolean;
}

export function StatusPill({
  status,
  showDot = true,
  className,
  ...props
}: StatusPillProps) {
  const tone = crmStatusToneMap[status] ?? "neutral";

  return (
    <StatusBadge tone={tone} showDot={showDot} className={className} {...props}>
      {status}
    </StatusBadge>
  );
}
