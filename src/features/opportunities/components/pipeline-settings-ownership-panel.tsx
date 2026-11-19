'use client';

import { FieldHelp } from '@/components/ui/field-help';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { TeamMemberOption } from '@/domain/opportunities/detail-view';
import type { SettingsPanelProps } from '@/features/opportunities/components/pipeline-settings-shared';

type PipelineOwnershipSettingsPanelProps = SettingsPanelProps & {
  members: TeamMemberOption[];
  membersLoading: boolean;
  ownerId: string;
  onOwnerChange: (ownerId: string) => void;
};

export function PipelineOwnershipSettingsPanel({
  hidden,
  members,
  membersLoading,
  ownerId,
  onOwnerChange,
}: PipelineOwnershipSettingsPanelProps) {
  const currentOwner = members.find((member) => member.id === ownerId);
  const selectedOwnerId = members.some((member) => member.id === ownerId)
    ? ownerId
    : '';

  return (
    <section hidden={hidden} className="space-y-5 text-ink-700">
      <div>
        <div className="flex items-center gap-1.5">
          <h3 className="text-[15px] font-bold text-ink-900">Transfer ownership</h3>
          <FieldHelp
            content="Choose the organisation member responsible for managing this pipeline."
            label="Help: Transfer ownership"
          />
        </div>
        <p className="mt-1 text-[12px] font-medium text-ink-500">
          Choose another organisation member to manage this pipeline.
        </p>
      </div>

      <div className="rounded-2xl border border-line p-4">
        <div className="flex items-center gap-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
            Current owner
          </p>
          <FieldHelp
            content="The member currently responsible for managing this pipeline."
            label="Help: Current owner"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-brand-50 text-[12px] font-extrabold text-brand-700">
            {currentOwner?.initials ?? '?'}
          </span>
          <div>
            <p className="text-[13px] font-bold text-ink-800">
              {currentOwner?.fullName ?? 'Unknown member'}
            </p>
            <p className="text-[11px] font-medium text-ink-500">{currentOwner?.role}</p>
          </div>
        </div>
      </div>

      <div className="max-w-xl">
        <div className="flex items-center gap-1">
          <Label htmlFor="pipeline-settings-owner">Transfer ownership to</Label>
          <FieldHelp
            content="Select an organisation member to become the pipeline owner."
            label="Help: Transfer ownership to"
          />
        </div>
        <Select
          id="pipeline-settings-owner"
          value={selectedOwnerId}
          disabled={membersLoading || members.length === 0}
          onChange={(event) => onOwnerChange(event.target.value)}
        >
          {members.length ? members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.fullName}
            </option>
          )) : (
            <option value="">
              {membersLoading ? 'Loading organisation members...' : 'No organisation members available'}
            </option>
          )}
        </Select>
        <p className="mt-2 text-[11px] font-medium text-ink-500">
          Ownership changes are applied when you save your changes.
        </p>
      </div>
    </section>
  );
}
