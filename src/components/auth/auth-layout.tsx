import Link from 'next/link';
import { FieldHelp } from '@/components/ui/field-help';
import { cn } from '@/lib/utils';
import {
  crmBrandPanelContent,
  type AuthBrandPanelContent,
} from '@/lib/auth/brand-panel-content';
import { AuthBrandPanel, AuthMobileBrandStrip } from '@/components/auth/auth-brand-panel';

export function AuthDivider({ className }: { className?: string }) {
  return (
    <div className={cn('my-5 flex items-center gap-3', className)}>
      <span className="h-px flex-1 bg-line" />
      <span className="text-[11.5px] font-semibold text-ink-400">or with email</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export function AuthCard({
  className,
  children,
  embedded = false,
}: {
  className?: string;
  children: React.ReactNode;
  embedded?: boolean;
}) {
  return (
    <div
      className={cn(
        embedded
          ? 'w-full'
          : 'rounded-xl3 border border-white bg-white p-6 shadow-auth-float sm:p-8',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Full-viewport split: marketing fixed left, form scrolls right. */
export function AuthUnifiedShell({
  children,
  brandContent = crmBrandPanelContent,
  showBrandPanel = true,
}: {
  children: React.ReactNode;
  brandContent?: AuthBrandPanelContent;
  showBrandPanel?: boolean;
}) {
  return (
    <div className="flex h-dvh min-h-dvh flex-col overflow-hidden lg:flex-row">
      {showBrandPanel ? <AuthMobileBrandStrip content={brandContent} /> : null}

      {showBrandPanel ? (
        <aside className="hidden h-dvh min-h-0 shrink-0 overflow-hidden lg:flex lg:w-[52%] xl:w-[54%] 2xl:w-[55%]">
          <AuthBrandPanel content={brandContent} />
        </aside>
      ) : null}

      <main
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white',
          showBrandPanel && 'border-l border-line/70',
        )}
      >
        {children}
      </main>
    </div>
  );
}

export function AuthPageFrame({
  children,
  brandContent = crmBrandPanelContent,
}: {
  children: React.ReactNode;
  brandContent?: AuthBrandPanelContent;
}) {
  return (
    <AuthUnifiedShell brandContent={brandContent}>
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col justify-start px-5 py-6 sm:justify-center sm:px-10 sm:py-10 xl:px-14 xl:py-12">
          {children}
        </div>
      </div>
    </AuthUnifiedShell>
  );
}

export function AuthFooterNote() {
  return (
    <p className="mx-auto mt-6 max-w-sm text-center text-[11px] leading-relaxed font-medium text-ink-400">
      CRM for sales teams. Protected with industry-standard encryption.
    </p>
  );
}

export function AuthModeToggle({
  prompt,
  action,
  href,
}: {
  prompt: string;
  action: string;
  href: string;
}) {
  return (
    <p className="mt-5 text-center text-[13px] font-medium text-ink-500">
      <span>{prompt}</span>
      <AuthLink href={href} className="ml-1">
        {action}
      </AuthLink>
    </p>
  );
}

export function AuthLabel({
  htmlFor,
  children,
  className,
  help,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
  help?: string;
}) {
  const label = (
    <label
      htmlFor={htmlFor}
      className={cn('mb-1.5 block text-[12px] font-bold', className)}
    >
      {children}
    </label>
  );

  if (!help) {
    return label;
  }

  return (
    <div className="mb-1.5 flex items-center gap-1">
      <label
        htmlFor={htmlFor}
        className={cn('mb-0 block text-[12px] font-bold', className)}
      >
        {children}
      </label>
      <FieldHelp
        content={help}
        label={`Help: ${typeof children === 'string' ? children : 'field'}`}
      />
    </div>
  );
}

export function AuthInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-12 w-full rounded-2xl border border-line bg-soft/30 px-4 text-[14px] transition-colors placeholder:text-ink-300 focus:border-brand-300 focus:bg-white xl:h-[50px] xl:text-[14.5px]',
        className,
      )}
      {...props}
    />
  );
}

export function AuthLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn('font-bold text-brand-600 hover:text-brand-700', className)}
    >
      {children}
    </Link>
  );
}
