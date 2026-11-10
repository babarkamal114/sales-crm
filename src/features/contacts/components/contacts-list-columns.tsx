'use client';

import { Columns3 } from 'lucide-react';
import {
  CONTACT_LIST_COLUMNS,
  CONTACT_LIST_COLUMN_LABELS,
  DEFAULT_CONTACT_LIST_COLUMNS,
  type ContactListColumnId,
} from '@/domain/contacts/list-columns';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function ContactsListColumns({
  visible,
  onChange,
}: {
  visible: ContactListColumnId[];
  onChange: (columns: ContactListColumnId[]) => void;
}) {
  const toggle = (id: ContactListColumnId) => {
    if (visible.includes(id)) {
      if (visible.length <= 1) return;
      onChange(visible.filter((col) => col !== id));
      return;
    }
    onChange([...visible, id]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="secondary" size="sm">
          <Columns3 className="size-4" aria-hidden />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 space-y-2 p-3">
        {CONTACT_LIST_COLUMNS.map((id) => (
          <label key={id} className="flex cursor-pointer items-center gap-2 text-[13px] font-medium">
            <input
              type="checkbox"
              checked={visible.includes(id)}
              onChange={() => toggle(id)}
            />
            {CONTACT_LIST_COLUMN_LABELS[id]}
          </label>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={() => onChange([...DEFAULT_CONTACT_LIST_COLUMNS])}
        >
          Reset columns
        </Button>
      </PopoverContent>
    </Popover>
  );
}
