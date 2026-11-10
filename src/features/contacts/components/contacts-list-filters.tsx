'use client';

import { useQuery } from '@tanstack/react-query';
import { Filter } from 'lucide-react';
import type { ContactListQuery } from '@/domain/contacts/list-query';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

async function fetchTags() {
  const response = await fetch('/api/v1/tags');
  if (!response.ok) return [];
  const data = (await response.json()) as { items: { id: string; name: string }[] };
  return data.items;
}

const LIFECYCLES = [
  { value: 'lead', label: 'Lead' },
  { value: 'customer', label: 'Customer' },
  { value: 'former_customer', label: 'Former customer' },
  { value: 'not_a_fit', label: 'Not a fit' },
] as const;

export function ContactsListFilters({
  query,
  onChange,
}: {
  query: ContactListQuery;
  onChange: (patch: Record<string, string | null>) => void;
}) {
  const { data: tags } = useQuery({ queryKey: ['contact-tags'], queryFn: fetchTags });

  const chips: { key: string; label: string }[] = [];
  if (query.lifecycle) {
    chips.push({
      key: 'lifecycle',
      label: LIFECYCLES.find((l) => l.value === query.lifecycle)?.label ?? query.lifecycle,
    });
  }
  if (query.tagId) {
    chips.push({
      key: 'tagId',
      label: tags?.find((t) => t.id === query.tagId)?.name ?? 'Tag',
    });
  }
  if (query.source) {
    chips.push({ key: 'source', label: `Source: ${query.source}` });
  }
  if (query.owner === 'me') {
    chips.push({ key: 'owner', label: 'Owner: me' });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="secondary" size="sm">
            <Filter className="size-4" aria-hidden />
            Filters
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 space-y-3 p-4">
          <label className="block text-[12px] font-semibold text-ink-500">Lifecycle</label>
          <select
            className="h-9 w-full rounded-lg border border-line bg-white px-2 text-[13px]"
            value={query.lifecycle ?? ''}
            onChange={(event) =>
              onChange({ lifecycle: event.target.value || null })
            }
          >
            <option value="">Any</option>
            {LIFECYCLES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <label className="block text-[12px] font-semibold text-ink-500">Tag</label>
          <select
            className="h-9 w-full rounded-lg border border-line bg-white px-2 text-[13px]"
            value={query.tagId ?? ''}
            onChange={(event) => onChange({ tagId: event.target.value || null })}
          >
            <option value="">Any</option>
            {(tags ?? []).map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>

          <label className="block text-[12px] font-semibold text-ink-500">Source contains</label>
          <input
            className="h-9 w-full rounded-lg border border-line bg-white px-2 text-[13px]"
            value={query.source ?? ''}
            onChange={(event) => onChange({ source: event.target.value.trim() || null })}
            placeholder="e.g. Manual"
          />

          <label className="block text-[12px] font-semibold text-ink-500">Owner</label>
          <select
            className="h-9 w-full rounded-lg border border-line bg-white px-2 text-[13px]"
            value={query.owner ?? 'all'}
            onChange={(event) =>
              onChange({
                owner: event.target.value === 'all' ? null : event.target.value,
              })
            }
          >
            <option value="all">Anyone</option>
            <option value="me">Me</option>
          </select>
        </PopoverContent>
      </Popover>

      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-line bg-white px-2.5 text-[12px] font-semibold text-ink-700"
        >
          {chip.label}
          <button
            type="button"
            className="text-ink-400 hover:text-ink-900"
            aria-label={`Remove ${chip.label} filter`}
            onClick={() => onChange({ [chip.key]: null })}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
