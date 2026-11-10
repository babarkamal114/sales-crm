import Link from 'next/link';
import { Button } from '@/components/ui/button';

function initialsFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || '?';
}

export function OnboardingAccountMenu({
  email,
  fullName,
}: {
  email: string;
  fullName?: string;
}) {
  const initials = fullName
    ? fullName
        .trim()
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : initialsFromEmail(email);

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="hidden items-center gap-2 sm:flex">
        <span
          className="grid size-9 place-items-center rounded-full bg-brand-100 text-[12px] font-extrabold text-brand-800 ring-2 ring-white"
          aria-hidden
        >
          {initials}
        </span>
        <span className="max-w-[160px] truncate text-[12px] font-semibold text-ink-600">
          {email}
        </span>
      </div>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/sign-out">Sign out</Link>
      </Button>
    </div>
  );
}
