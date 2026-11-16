'use client';

import { useMemo, useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserCog, UserPlus, Users } from 'lucide-react';
import type { PipelineListItem } from '@/domain/opportunities/card-view';
import type { TeamMemberOption } from '@/domain/opportunities/detail-view';
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { managePipelineMembersAction } from '@/server/actions/opportunities/manage-pipeline-members';
import { toast } from 'sonner';

type MembersQueryData = {
  members: TeamMemberOption[];
  assignedMemberIds: string[];
  creator : string;
};

const EMPTY_MEMBERS: TeamMemberOption[] = [];

type PipelineMetaResponse = {
  members: { id: string; fullName: string }[];
  creator : string;
};

async function fetchMembersForPipeline(pipelineId: string): Promise<MembersQueryData> {
  const [rosterResponse, pipelineResponse] = await Promise.all([
    fetch('/api/v1/org/members'),
    fetch(`/api/v1/pipelines/${pipelineId}/create-meta`),
  ]);
  if (!rosterResponse.ok) {
    throw new Error('Could not load organisation members.');
  }
  if (!pipelineResponse.ok) {
    throw new Error('Could not load the current pipeline members.');
  }

  const roster = (await rosterResponse.json()) as { items: TeamMemberOption[] };
  const pipelineMeta = (await pipelineResponse.json()) as PipelineMetaResponse;
  const organisationMemberIds = new Set(roster.items.map((member) => member.id));

  return {
    members: roster.items,
    assignedMemberIds: pipelineMeta.members
      .map((member) => member.id)
      .filter((id) => organisationMemberIds.has(id)),
      creator : pipelineMeta.creator
  };
}

type ManagePipelineMembersDialogProps = {
  pipeline: PipelineListItem | null;
  pipelineId: string;
};

export default function ManagePipelineMembersDialog({
  pipeline,
  pipelineId,
}: ManagePipelineMembersDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [pending, startTransition] = useTransition();

  const membersQuery = useQuery({
    queryKey: ['pipeline-members', pipelineId],
    queryFn: () => fetchMembersForPipeline(pipelineId),
    enabled: open && Boolean(pipelineId),
  });

  const members = membersQuery.data?.members ?? EMPTY_MEMBERS;
  const assignedMemberIds = membersQuery.data?.assignedMemberIds ?? [];
  const creatorId = membersQuery.data?.creator
  const initialSelectedIds = creatorId ? [...new Set([...assignedMemberIds, creatorId])] : assignedMemberIds;
  const selectedMemberIds = selectedIds ?? initialSelectedIds;

  const filteredMembers = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return members;

    return members.filter((member) =>
      member.fullName.toLowerCase().includes(search),
    );
  }, [members, query]);

  const hasChanges =
    selectedMemberIds.length !== assignedMemberIds.length ||
    selectedMemberIds.some((id) => !assignedMemberIds.includes(id));

  function saveMembers() {
    startTransition(async () => {
      const result = await managePipelineMembersAction({
        pipelineId,
        memberIds: selectedMemberIds,
      });

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success('Pipeline members updated');
      void queryClient.invalidateQueries({
        queryKey: ['pipeline-members', pipelineId],
        refetchType: 'none',
      });
      handleOpenChange(false);
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSelectedIds(null);
      setQuery('');
    }
  }

  function toggleMember(memberId: string) {
    setSelectedIds((current) => {
      const currentSelection = current ?? assignedMemberIds;
      return currentSelection.includes(memberId)
        ? currentSelection.filter((id) => id !== memberId)
        : [...currentSelection, memberId];
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="icon"
        aria-label="Manage pipeline members"
        title="Manage pipeline members"
        onClick={() => handleOpenChange(true)}
      >
        <UserCog className="size-4" aria-hidden /> Manage Members
      </Button>

      <DialogContent
        className="max-w-md gap-0 overflow-hidden p-0"
        data-pipeline-id={pipelineId}
      >
        <DialogHeader className="relative border-b border-line/70 px-6 py-5 pr-14">
          <DialogTitle>Manage members</DialogTitle>
          <DialogDescription>
            Choose who can access{' '}
            <span className="font-semibold text-ink-800">
              {pipeline?.name ?? 'this pipeline'}
            </span>
            .
          </DialogDescription>
          <DialogCloseButton className="absolute right-5 top-5" />
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          <div className="flex items-center justify-between">
            <Badge variant="default" className="flex gap-x-2">
              <Users className="h-4 w-4" /> {selectedMemberIds.length} members selected
            </Badge>
            <Button
              type="button"
              variant="secondary"
              aria-label="Invitations are not available yet"
              title="Invitations are not available yet"
              disabled
            >
              <UserPlus className="h-4 w-4" /> Invite Members
            </Button>
          </div>

          <label className="relative block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search organisation members"
              aria-label="Search organisation members"
              className="h-10 rounded-xl pl-9"
            />
          </label>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">
              Organisation members
            </p>
            <ul className="max-h-72 overflow-y-auto rounded-xl border border-line/70">
              {membersQuery.isLoading ? (
                <li className="px-4 py-8 text-center text-[12px] font-medium text-ink-500">
                  Loading organisation members…
                </li>
              ) : membersQuery.isError ? (
                <li className="px-4 py-8 text-center text-[12px] font-medium text-red-600">
                  {membersQuery.error instanceof Error
                    ? membersQuery.error.message
                    : 'Could not load pipeline members. Please try again.'}
                </li>
              ) : filteredMembers.length === 0 ? (
                <li className="px-4 py-8 text-center text-[12px] font-medium text-ink-500">
                  {members.length === 0
                    ? 'No organisation members found.'
                    : 'No members match that search.'}
                </li>
              ) : (
                filteredMembers.map((member) => {
                  const checked = selectedMemberIds.includes(member.id);
                  const isCreator = member.id === creatorId
                  return (
                    <li key={member.id} className="border-b border-line/60 last:border-0">
                      <label className="flex cursor-pointer items-center gap-3 px-3.5 py-3 transition-colors hover:bg-soft/50">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isCreator}
                          onChange={() => toggleMember(member.id)}
                          className="size-4 rounded border-line text-brand-600 focus:ring-brand-300"
                        />
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-extrabold text-brand-700">
                          {member.initials}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-bold text-ink-800">
                            {member.fullName}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          <p className="text-[11px] leading-relaxed text-ink-500">
            Members with access can view and work with opportunities in this pipeline.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-line/70 bg-soft/30 px-6 py-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={saveMembers}
            disabled={
              pending ||
              membersQuery.isLoading ||
              membersQuery.isError ||
              !hasChanges
            }
          >
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
