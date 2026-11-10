import { cn } from '@/lib/utils';

const BRAND_LOGO_ASPECT_RATIO = 8569 / 1986;

const BRAND_LOGO_SRC = {
  default: '/logo/sponsoro-logo.svg',
  light: '/logo/sponsoro-logo-white.svg',
} as const;

export function SponsoroBrandLogo({
  className,
  height = 40,
  variant = 'default',
}: {
  className?: string;
  height?: number;
  variant?: keyof typeof BRAND_LOGO_SRC;
}) {
  const width = Math.round(BRAND_LOGO_ASPECT_RATIO * height);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_SRC[variant]}
      alt="CRM"
      width={width}
      height={height}
      className={cn('block w-auto max-w-full shrink-0', className)}
      style={{ height }}
    />
  );
}
