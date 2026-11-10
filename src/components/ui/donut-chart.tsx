'use client';

import { cn } from '@/lib/utils';

export type DonutSegment = {
  id: string;
  value: number;
  colorClass: string;
  label: string;
};

const BRAND_STROKE: Record<string, string> = {
  'brand-700': 'stroke-brand-700',
  'brand-500': 'stroke-brand-500',
  'brand-300': 'stroke-brand-300',
  'brand-100': 'stroke-brand-100',
  'ink-300': 'stroke-ink-300',
};

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
  summary,
  activeId,
  onSegmentHover,
  className,
}: {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string;
  summary: string;
  activeId?: string | null;
  onSegmentHover?: (id: string | null) => void;
  className?: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={cn('flex items-center gap-5', className)}>
      <div className="relative size-[132px] shrink-0">
        <svg
          viewBox="0 0 120 120"
          className="size-full -rotate-90"
          role="img"
          aria-label={summary}
        >
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            className="stroke-soft"
            strokeWidth="16"
          />
          {segments.map((segment) => {
            const length = total > 0 ? (segment.value / total) * circumference : 0;
            const dash = `${length} ${circumference - length}`;
            const circle = (
              <circle
                key={segment.id}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                strokeWidth="16"
                strokeDasharray={dash}
                strokeDashoffset={-offset}
                className={cn(
                  BRAND_STROKE[segment.colorClass] ?? 'stroke-brand-500',
                  activeId && activeId !== segment.id && 'opacity-40',
                )}
                onMouseEnter={() => onSegmentHover?.(segment.id)}
                onMouseLeave={() => onSegmentHover?.(null)}
              />
            );
            offset += length;
            return circle;
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="tnum text-[22px] font-extrabold leading-none text-ink-900">
              {centerValue}
            </p>
            <p className="text-[11px] font-medium text-ink-400">{centerLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
