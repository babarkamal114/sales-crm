'use client';

import { ChevronDown, Link2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function CompanyContactMenu({
  onAddNew,
  onLinkExisting,
}: {
  onAddNew: () => void;
  onLinkExisting: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="secondary" size="sm">
          <UserPlus className="size-4" />
          Contact
          <ChevronDown className="size-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={onAddNew}>
          <UserPlus className="size-4" />
          Add new contact
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onLinkExisting}>
          <Link2 className="size-4" />
          Link existing contact
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
