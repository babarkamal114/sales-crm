'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FieldHelp } from '@/components/ui/field-help';
import { Input } from '@/components/ui/input';
import type { PipelineMembersSettingsProps } from '@/features/opportunities/components/pipeline-settings-shared';
import { Label } from '@/components/ui/label';

export function PipelineMembersSettingsPanel({
  hidden,
  members,
  memberIds,
  ownerId,
  onMemberIdsChange,
}: PipelineMembersSettingsProps) {
  const [memberSearch, setMemberSearch] = useState('');

  const filteredMembers = useMemo(() => {
    const search = memberSearch.trim().toLowerCase();
    return members.filter((member) =>
      member.fullName.toLowerCase().includes(search),
    );
  }, [members, memberSearch]);

  function toggleMember(memberId: string) {
    if (memberId === ownerId) return;
    onMemberIdsChange(
      memberIds.includes(memberId)
        ? memberIds.filter((id) => id !== memberId)
        : [...memberIds, memberId],
    );
  }

  return (
    <section hidden={hidden} className="space-y-4 text-ink-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-[15px] font-bold text-ink-900">Pipeline members</h3>
            <FieldHelp
              content="Choose which organisation members can access this pipeline."
              label="Help: Pipeline members"
            />
          </div>
          <p className="mt-1 text-[12px] font-medium text-ink-500">
            Choose which organisation members can access this pipeline.
          </p>
        </div>
        <Badge variant="default">{memberIds.length} selected</Badge>
      </div>

      <div className="flex items-center gap-2">
        <label className="relative block flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            aria-hidden
          />
          <Input
            value={memberSearch}
            onChange={(event) => setMemberSearch(event.target.value)}
            placeholder="Search organisation members"
            aria-label="Search organisation members"
            className="pl-9"
          />
        </label>
        <FieldHelp
          content="Filter the organisation member list by name."
          label="Help: Search organisation members"
        />
      </div>

      <ul className="max-h-64 overflow-y-auto rounded-2xl border border-line">
        {filteredMembers.length ? (
          filteredMembers.map((member) => {
            const isOwner = member.id === ownerId;
            return (
              <li key={member.id} className="border-b border-line/70 last:border-0">
                <Label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-soft/60">
                  <Input
                    type="checkbox"
                    checked={memberIds.includes(member.id) || isOwner}
                    disabled={isOwner}
                    onChange={() => toggleMember(member.id)}
                    className="size-4 rounded border-line text-brand-600 focus:ring-brand-300"
                  />
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-extrabold text-brand-700">
                    {member.initials}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink-800">
                    {member.fullName}
                  </span>
                </Label>
              </li>
            );
          })
        ) : (
          <li className="px-4 py-8 text-center text-[12px] font-medium text-ink-500">
            No members match that search.
          </li>
        )}
      </ul>
    </section>
  );
}
