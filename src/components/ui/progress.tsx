import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/tokens";

export interface Segment {
  value: number;
  tone: StatusTone | "brand";
}

const segmentToneStyles: Record<Segment["tone"], string> = {
  clear: "bg-mint-600",
  risk: "bg-amber-600",
  action: "bg-rose-600",
  neutral: "bg-ink-300",
  brand: "bg-brand-500",
};

export interface SegmentedBarProps extends HTMLAttributes<HTMLDivElement> {
  segments: Segment[];
  size?: "sm" | "md";
}

export function SegmentedBar({
  segments,
  size = "md",
  className,
  ...props
}: SegmentedBarProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div
      className={cn(
        "flex gap-0.5 overflow-hidden rounded-full bg-soft",
        size === "sm" ? "h-2" : "h-2.5",
        className,
      )}
      {...props}
    >
      {segments.map((segment, index) => (
        <div
          key={`${segment.tone}-${index}`}
          className={cn("h-full rounded-full", segmentToneStyles[segment.tone])}
          style={{ width: total > 0 ? `${(segment.value / total) * 100}%` : "0%" }}
        />
      ))}
    </div>
  );
}

export interface RingProgressProps {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const ringSizes = {
  sm: { box: "size-14", text: "text-[13px]", stroke: 12 },
  md: { box: "size-[70px]", text: "text-[16px]", stroke: 11 },
  lg: { box: "size-20", text: "text-[18px]", stroke: 11 },
} as const;

export function RingProgress({
  value,
  size = "md",
  className,
  label,
}: RingProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const config = ringSizes[size];

  return (
    <div
      className={cn("relative shrink-0", config.box, className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${clamped}% complete`}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          className="stroke-soft"
          strokeWidth={config.stroke}
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          className="stroke-brand-500"
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("font-extrabold tnum", config.text)}>
          {size === "sm" ? clamped : `${clamped}%`}
        </span>
      </div>
    </div>
  );
}
