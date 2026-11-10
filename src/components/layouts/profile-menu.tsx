'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar } from '@/components/ui/avatar';
import { signOutAction } from '@/server/actions/auth';
import { toast } from '@/components/ui/sonner';

function initialsFromName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return `${first}${second}`.toUpperCase();
}

export function ProfileMenu({
  fullName,
  email,
  organisationName,
  role,
}: {
  fullName: string;
  email: string;
  organisationName: string;
  role: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex shrink-0 items-center gap-2 rounded-2xl border border-line bg-white px-2 py-1.5 shadow-chip transition-colors hover:bg-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          aria-label="Open user menu"
        >
          <Avatar initials={initialsFromName(fullName)} size="sm" />
          <span className="hidden max-w-[140px] truncate text-[12.5px] font-semibold text-ink-700 sm:inline">
            {fullName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="space-y-0.5">
            <p className="text-[13px] font-bold text-ink-900">{fullName}</p>
            <p className="text-[11.5px] font-medium text-ink-500">{email}</p>
            <p className="text-[11.5px] font-medium text-ink-500">
              {organisationName} · {role}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await signOutAction();
              if (!result.ok) {
                toast.error(result.error.message);
                return;
              }
              setOpen(false);
              router.push(result.data.redirectTo);
              router.refresh();
            });
          }}
        >
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
