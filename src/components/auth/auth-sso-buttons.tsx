function GoogleIcon() {
  return (
    <svg className="size-[18px]" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="size-[18px]" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#F25022" d="M11.4 11.4H3V3h8.4v8.4Z" />
      <path fill="#7FBA00" d="M21 11.4h-8.4V3H21v8.4Z" />
      <path fill="#00A4EF" d="M11.4 21H3v-8.4h8.4V21Z" />
      <path fill="#FFB900" d="M21 21h-8.4v-8.4H21V21Z" />
    </svg>
  );
}

const ssoButtonClass =
  'inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl border border-line bg-soft/40 text-[13.5px] font-semibold text-ink-700 no-underline transition-colors hover:border-brand-200 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 xl:h-[50px] xl:text-[14px]';

export function AuthSsoButtons({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <a href={`/api/auth/google/start?mode=${mode}`} className={ssoButtonClass}>
        <GoogleIcon />
        Google
      </a>
      <a
        href={`/api/auth/microsoft/start?mode=${mode}`}
        className={ssoButtonClass}
      >
        <MicrosoftIcon />
        Microsoft
      </a>
    </div>
  );
}
