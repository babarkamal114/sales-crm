'use client';

import { MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { openConversationForContact } from '@/features/conversations/lib/open-conversation-for-contact';
import { linkContactToCompanyAction } from '@/server/actions/companies/link-contact';
import { unlinkContactFromCompanyAction } from '@/server/actions/companies/unlink-contact';
import { updateContactCompanyRoleAction } from '@/server/actions/companies/update-contact-company-role';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type CompanyPeopleRow = {
  id: string;
  version: number;
  displayName: string;
  isPrimary: boolean;
  role: string | null;
};

export function CompanyPeopleRowActions({
  companyId,
  person,
  onChanged,
}: {
  companyId: string;
  person: CompanyPeopleRow;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) => {
    startTransition(() => void fn());
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="size-8 shrink-0 p-0"
          disabled={pending}
          aria-label={`Actions for ${person.displayName}`}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuItem
          onSelect={() =>
            run(async () => {
              const ok = await openConversationForContact(router, person.id, 'email');
              if (!ok) toast.error('Could not open conversation.');
            })
          }
        >
          Email
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            run(async () => {
              const ok = await openConversationForContact(router, person.id);
              if (!ok) toast.error('Could not open conversation.');
            })
          }
        >
          Message
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {!person.isPrimary ? (
          <DropdownMenuItem
            onSelect={() =>
              run(async () => {
                const result = await linkContactToCompanyAction({
                  contactId: person.id,
                  companyId,
                  version: person.version,
                  isPrimary: true,
                });
                if (!result.ok) {
                  toast.error(result.error.message);
                  return;
                }
                toast.success('Set as primary company');
                onChanged();
              })
            }
          >
            Set as primary
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem
          onSelect={() =>
            run(async () => {
              const next = window.prompt('Role at this company', person.role ?? '');
              if (next === null) return;
              const result = await updateContactCompanyRoleAction({
                contactId: person.id,
                companyId,
                version: person.version,
                role: next,
              });
              if (!result.ok) {
                toast.error(result.error.message);
                return;
              }
              toast.success('Role updated');
              onChanged();
            })
          }
        >
          Edit role…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-rose-700 focus:text-rose-700"
          onSelect={() =>
            run(async () => {
              if (
                !window.confirm(
                  `Remove ${person.displayName} from this company? They will stay in your CRM.`,
                )
              ) {
                return;
              }
              const result = await unlinkContactFromCompanyAction({
                contactId: person.id,
                companyId,
                version: person.version,
              });
              if (!result.ok) {
                toast.error(result.error.message);
                return;
              }
              toast.success('Contact unlinked');
              onChanged();
            })
          }
        >
          Unlink from company
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
