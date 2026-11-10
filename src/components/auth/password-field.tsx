'use client';

import { useState } from 'react';
import { scorePassword } from '@/lib/auth/content';
import { cn } from '@/lib/utils';
import { AuthInput } from '@/components/auth/auth-layout';

function MailIcon() {
  return (
    <svg
      className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-300"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-300"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function PasswordEyeIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
        <path d="m4 4 16 16" strokeWidth={1.9} />
      </svg>
    );
  }

  return (
    <svg
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function PasswordField({
  id = 'password',
  value = '',
  onChange,
  autoComplete = 'current-password',
  showStrength = false,
}: {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  autoComplete?: 'current-password' | 'new-password';
  showStrength?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const strength = showStrength ? scorePassword(value) : null;

  return (
    <div>
      <div className="relative">
        <LockIcon />
        <AuthInput
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          placeholder="••••••••••"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          className="pr-11 pl-11 xl:h-[50px]"
        />
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-ink-400 transition-colors hover:text-ink-700"
          onClick={() => setVisible((current) => !current)}
        >
          <PasswordEyeIcon hidden={visible} />
        </button>
      </div>

      {showStrength ? (
        <div className="mt-2.5">
          <div className="flex gap-1.5">
            {Array.from({ length: 4 }, (_, index) => (
              <span
                key={index}
                className="pw-seg"
                style={{
                  backgroundColor:
                    strength && strength.score > index && strength.colour
                      ? strength.colour
                      : 'var(--color-line)',
                }}
              />
            ))}
          </div>
          <p
            className={cn(
              'mt-1.5 text-[11px] font-semibold',
              !strength?.colour && 'text-ink-400',
            )}
            style={strength?.colour ? { color: strength.colour } : undefined}
          >
            {strength?.label}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function EmailField({
  id = 'email',
  value,
  onChange,
}: {
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="relative">
      <MailIcon />
      <AuthInput
        id={id}
        type="email"
        autoComplete="email"
        placeholder="you@company.co.uk"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="pr-4 pl-11 xl:h-[50px]"
      />
    </div>
  );
}
