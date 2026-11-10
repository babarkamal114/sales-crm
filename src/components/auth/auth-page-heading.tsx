export type AuthMode = 'sign-in' | 'sign-up';

const copy: Record<AuthMode, { eyebrow: string; subtitle: string }> = {
  'sign-in': {
    eyebrow: 'Welcome back',
    subtitle: 'Sign in to your CRM workspace.',
  },
  'sign-up': {
    eyebrow: 'Get started',
    subtitle: 'Create your organisation. The first user becomes Admin.',
  },
};

export function AuthPageHeading({
  mode,
  pageHeading,
}: {
  mode: AuthMode;
  pageHeading: string;
}) {
  const text = copy[mode];

  return (
    <div className="mb-7">
      <p className="text-[11.5px] font-bold tracking-wide text-brand-600 uppercase xl:text-[12px]">
        {text.eyebrow}
      </p>
      <h1 className="mt-1.5 text-[26px] font-extrabold tracking-tight text-ink-900 xl:text-[28px]">
        {pageHeading}
      </h1>
      <p className="mt-2 text-[14px] font-medium text-ink-500 xl:text-[15px]">
        {text.subtitle}
      </p>
    </div>
  );
}
