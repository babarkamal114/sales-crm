import {
  crmBrandPanelContent,
  type AuthBrandPanelContent,
} from '@/lib/auth/brand-panel-content';
import { SponsoroBrandLogo } from '@/components/layouts/sponsoro-logo';

function CheckIcon() {
  return (
    <svg
      className="size-4 text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

function TrustLockIcon() {
  return (
    <svg
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function TrustShieldIcon() {
  return (
    <svg
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" />
    </svg>
  );
}

function BrandLogo({ inverted = false, large = false }: { inverted?: boolean; large?: boolean }) {
  return (
    <SponsoroBrandLogo
      height={large ? 44 : 38}
      variant={inverted ? 'light' : 'default'}
    />
  );
}

function BrandBenefitsList({ benefits }: { benefits: readonly string[] }) {
  return (
    <ul className="mt-10 max-w-lg space-y-4 xl:mt-12 xl:space-y-5">
      {benefits.map((benefit) => (
        <li key={benefit} className="flex items-start gap-3.5">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-xl bg-white/15 xl:size-8">
            <CheckIcon />
          </span>
          <span className="text-[14.5px] leading-snug font-medium text-white/90 xl:text-[15.5px]">
            {benefit}
          </span>
        </li>
      ))}
    </ul>
  );
}

function BrandHeadline({ lines }: { lines: readonly string[] }) {
  return (
    <h2 className="max-w-lg text-[34px] leading-[1.06] font-extrabold tracking-tight xl:text-[40px] 2xl:text-[44px]">
      {lines.map((line, index) => (
        <span key={line}>
          {index > 0 ? <br /> : null}
          {line}
        </span>
      ))}
    </h2>
  );
}

/** Desktop left column — full-height, edge-to-edge, no scroll. */
export function AuthBrandPanel({
  content = crmBrandPanelContent,
}: {
  content?: AuthBrandPanelContent;
}) {
  return (
    <div className="relative flex h-full w-full min-h-0 flex-col justify-between overflow-hidden p-12 xl:p-14 2xl:p-16">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700" />
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, white 0 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div
        className="pointer-events-none absolute -right-20 top-1/2 size-64 -translate-y-1/2 rounded-full bg-white/10 blur-3xl xl:size-72"
        aria-hidden
      />

      <div className="relative">
        <BrandLogo inverted large />
      </div>

      <div className="relative my-8 text-white xl:my-10">
        <p className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold tracking-wide text-white/90 uppercase xl:text-[11.5px]">
          {content.badge}
        </p>
        <BrandHeadline lines={content.headlineLines} />
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed font-medium text-white/80 xl:mt-5 xl:text-[16.5px] xl:leading-relaxed">
          {content.description}
        </p>
        <BrandBenefitsList benefits={content.benefits} />
      </div>

      <div className="relative flex flex-wrap items-center gap-x-5 gap-y-2.5 text-white/80">
        <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold xl:text-[13px]">
          <TrustLockIcon />
          UK data residency
        </span>
        <span className="size-1.5 rounded-full bg-white/40" />
        <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold xl:text-[13px]">
          <TrustShieldIcon />
          Encrypted at rest
        </span>
        <span className="size-1.5 rounded-full bg-white/40" />
        <span className="text-[12.5px] font-semibold xl:text-[13px]">
          CRM
        </span>
      </div>
    </div>
  );
}

/** Mobile marketing strip — fixed height, form scrolls below. */
export function AuthMobileBrandStrip({
  content = crmBrandPanelContent,
}: {
  content?: AuthBrandPanelContent;
}) {
  return (
    <div className="relative shrink-0 overflow-hidden px-5 py-5 sm:px-8 sm:py-6 lg:hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-500 to-brand-700" />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 30%, white 0 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      <div className="relative">
        <BrandLogo inverted large />
        <h2 className="mt-5 max-w-md text-[24px] leading-tight font-extrabold tracking-tight text-white sm:text-[26px]">
          {content.mobileHeadline}
        </h2>
        <p className="mt-2 max-w-md text-[13.5px] leading-relaxed font-medium text-white/80 sm:text-[14px]">
          {content.description}
        </p>
      </div>
    </div>
  );
}
