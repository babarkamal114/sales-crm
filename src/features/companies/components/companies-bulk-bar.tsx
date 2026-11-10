'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { bulkCompanyActionSchema } from '@/domain/companies/mutation-schemas';
import { bulkCompanyAction } from '@/server/actions/companies/bulk-company-action';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { MergeCompaniesDialog } from '@/features/companies/components/merge-companies-dialog';

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

export function CompaniesBulkBar({
  selectedIds,
  selectedRows,
  canDelete,
  canChangeOwner,
  onClear,
  onComplete,
}: {
  selectedIds: string[];
  selectedRows: { id: string; name: string; domain: string | null }[];
  canDelete: boolean;
  canChangeOwner: boolean;
  onClear: () => void;
  onComplete: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [tagId, setTagId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [mergeOpen, setMergeOpen] = useState(false);

  const { data: tags } = useQuery({ queryKey: ['contact-tags'], queryFn: fetchTags });
  const { data: members } = useQuery({
    queryKey: ['org-members'],
    queryFn: fetchMembers,
    enabled: canChangeOwner,
  });

  const mergeEnabled = selectedIds.length === 2;
  const mergePair =
    mergeEnabled && selectedRows.length === 2
      ? ([selectedRows[0]!, selectedRows[1]!] as [
          { id: string; name: string; domain: string | null },
          { id: string; name: string; domain: string | null },
        ])
      : null;

  type BulkPayload = z.infer<typeof bulkCompanyActionSchema>;

  const runBulk = (payload: BulkPayload) => {
    startTransition(async () => {
      const result = await bulkCompanyAction(payload);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      if (result.data.jobQueued) {
        toast.message('Bulk action queued', {
          description: 'We will process the remaining records in the background.',
        });
      } else if (payload.action === 'export') {
        toast.message('Export started', {
          description: `Queued export for ${result.data.processed} company(ies).`,
        });
      } else if (payload.action === 'delete') {
        toast.success(`Deleted ${result.data.processed} company(ies). Contacts were kept.`);
      } else {
        toast.success(`Updated ${result.data.processed} company(ies)`);
      }
      onComplete();
      onClear();
    });
  };

  const confirmDelete = () => {
    const n = selectedIds.length;
    if (
      !window.confirm(
        `Delete ${n} ${n === 1 ? 'company' : 'companies'}? Their contacts are kept; deals stay but lose the company link.`,
      )
    ) {
      return;
    }
    runBulk({ action: 'delete', companyIds: selectedIds });
  };

  return (
    <>
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
              companyIds: selectedIds,
              tagIds: [tagId],
              mode: 'add',
            })
          }
        >
          Tag
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
                  companyIds: selectedIds,
                  ownerId,
                })
              }
            >
              Change owner
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending || !mergeEnabled}
          onClick={() => {
            if (!mergeEnabled) {
              toast.message('Select exactly two companies to merge');
              return;
            }
            setMergeOpen(true);
          }}
        >
          Merge
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => runBulk({ action: 'export', companyIds: selectedIds })}
        >
          Export
        </Button>
        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            className="text-rose-700"
            onClick={confirmDelete}
          >
            Delete
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={onClear}>
          Clear
        </Button>
      </div>

      {mergePair ? (
        <MergeCompaniesDialog
          open={mergeOpen}
          onOpenChange={setMergeOpen}
          companies={mergePair}
          onMerged={() => {
            onComplete();
            onClear();
          }}
        />
      ) : null}
    </>
  );
}
