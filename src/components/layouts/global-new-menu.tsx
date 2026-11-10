'use client';

import { ChevronDown, Plus } from 'lucide-react';
import { useCreateDialog } from '@/components/create-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/sonner';

export function GlobalNewMenu() {
  const { openCreate } = useCreateDialog();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="primary" className="gap-1.5">
          <Plus className="size-4" strokeWidth={2.2} aria-hidden />
          <span className="hidden sm:inline">New</span>
          <ChevronDown className="size-3.5 opacity-80" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => openCreate('contact')}>Contact</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openCreate('company')}>Company</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openCreate('opportunity')}>Opportunity</DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => toast.message('Task create opens from the contact or deal record')}
        >
          Task
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
