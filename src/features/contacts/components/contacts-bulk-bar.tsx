'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { bulkContactAction } from '@/server/actions/contacts/bulk-contact-action';
import { Button } from '@/components/ui/button';

async function fetchTags() {
  const response = await fetch('/api/v1/tags');
  if (!response.ok) throw new Error('Failed to load tags');
  const data = (await response.json()) as {
    items: { id: string; name: string; colourKey: string }[];
  };
  return data.items;
}

async function fetchMembers() {
  const response = await fetch('/api/v1/org/members');
  if (!response.ok) throw new Error('Failed to load team');
  const data = (await response.json()) as { items: { id: string; fullName: string }[] };
  return data.items;
}

export function ContactsBulkBar({
  selectedIds,
  canDelete,
  canChangeOwner,
  onClear,
  onComplete,
  onSendEmail,
}: {
  selectedIds: string[];
  canDelete: boolean;
  canChangeOwner: boolean;
  onClear: () => void;
  onComplete: () => void;
  onSendEmail: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [tagId, setTagId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const { data: tags } = useQuery({ queryKey: ['contact-tags'], queryFn: fetchTags });
  const { data: members } = useQuery({
    queryKey: ['org-members'],
    queryFn: fetchMembers,
    enabled: canChangeOwner,
  });

  const runBulk = (payload: Parameters<typeof bulkContactAction>[0]) => {
    startTransition(async () => {
      const result = await bulkContactAction(payload);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      if (result.data.jobQueued) {
        toast.message('Bulk action queued', {
          description: 'We will process the remaining records in the background.',
        });
      } else if (result.data.email) {
        toast.message('Email preview', {
          description: `${result.data.email.sendable} sendable · ${result.data.email.skipped} skipped (consent/DND)`,
        });
      } else {
        toast.success(`Updated ${result.data.processed} contact(s)`);
      }
      onComplete();
      onClear();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-brand-100 bg-brand-50 px-4 py-2.5">
      <b className="text-[13px] font-bold text-brand-700">{selectedIds.length} selected</b>
      <select
        className="h-8 max-w-[160px] rounded-lg border border-line bg-white px-2 text-[12px] font-medium"
        value={tagId}
        onChange={(event) => setTagId(event.target.value)}
        aria-label="Tag to add"
      >
        <option value="">Add tag…</option>
        {(tags ?? []).map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending || !tagId}
        onClick={() =>
          runBulk({
            action: 'tag',
            contactIds: selectedIds,
            tagIds: [tagId],
            mode: 'add',
          })
        }
      >
        Apply tag
      </Button>
      {canChangeOwner ? (
        <>
          <select
            className="h-8 max-w-[160px] rounded-lg border border-line bg-white px-2 text-[12px] font-medium"
            value={ownerId}
            onChange={(event) => setOwnerId(event.target.value)}
            aria-label="New owner"
          >
            <option value="">Change owner…</option>
            {(members ?? []).map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending || !ownerId}
            onClick={() =>
              runBulk({
                action: 'owner',
                contactIds: selectedIds,
                ownerId,
              })
            }
          >
            Apply owner
          </Button>
        </>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => runBulk({ action: 'follow', contactIds: selectedIds })}
      >
        Follow
      </Button>
      <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onSendEmail}>
        Send email
      </Button>
      {canDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          className="text-rose-700"
          onClick={() => runBulk({ action: 'delete', contactIds: selectedIds })}
        >
          Delete
        </Button>
      ) : null}
      <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={onClear}>
        Clear selection
      </Button>
    </div>
  );
}
