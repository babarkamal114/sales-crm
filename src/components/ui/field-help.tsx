"use client";

import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export interface FieldHelpProps {
  content: string;
  label?: string;
  className?: string;
}

/** Help icon with hover tooltip — portalled so it is not clipped inside scrollable dialogs. */
export function FieldHelp({
  content,
  label = "Field help",
  className,
}: FieldHelpProps) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex size-[18px] shrink-0 items-center justify-center rounded-full text-ink-300 transition-colors hover:text-brand-600 focus-visible:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200",
            className,
          )}
          aria-label={label}
        >
          <CircleHelp className="size-3.5" strokeWidth={2.2} aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="center">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
