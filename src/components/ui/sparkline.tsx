'use client';

import type { SparklinePoint } from '@/domain/dashboard/types';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function Sparkline({
  points,
  strokeClassName = 'stroke-brand-500',
  fillClassName = 'fill-brand-500/10',
  formatValue,
  className,
}: {
  points: SparklinePoint[];
  strokeClassName?: string;
  fillClassName?: string;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  if (points.length === 0) {
    return <div className={cn('h-[34px]', className)} aria-hidden />;
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((point, index) => {
    const x = (index / Math.max(points.length - 1, 1)) * 200;
    const y = 30 - ((point.value - min) / range) * 24;
    return { x, y, point };
  });

  const line = coords
    .map((coord, index) => `${index === 0 ? 'M' : 'L'}${coord.x},${coord.y}`)
    .join(' ');
  const area = `${line} L200,34 L0,34 Z`;

  return (
    <svg
      className={cn('block h-[34px] w-full', className)}
      viewBox="0 0 200 34"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={area} className={fillClassName} />
      <path
        d={line}
        fill="none"
        className={strokeClassName}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      {coords.map((coord) => (
        <Tooltip key={coord.point.bucketStart}>
          <TooltipTrigger asChild>
            <circle
              cx={coord.x}
              cy={coord.y}
              r={3}
              className="fill-transparent stroke-transparent"
            />
          </TooltipTrigger>
          <TooltipContent>
            {formatValue
              ? formatValue(coord.point.value)
              : String(coord.point.value)}
          </TooltipContent>
        </Tooltip>
      ))}
    </svg>
  );
}
