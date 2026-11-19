'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  ArrowLeftRight,
  ListOrdered,
  LucideIcon,
  Settings2,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PipelineListItem } from '@/domain/opportunities/card-view';
import { DEFAULT_PIPELINE_COLOR } from '@/domain/pipeline/colors';
import type { TeamMemberOption } from '@/domain/opportunities/detail-view';
import { Button } from '@/components/ui/button';
import { FieldHelp } from '@/components/ui/field-help';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { qk } from '@/lib/query-keys';
import {
  GeneralPipelineSettingsPanel,
  PipelineMembersSettingsPanel,
  PipelineOwnershipSettingsPanel,
  PipelineRiskSettingsPanel,
} from '@/features/opportunities/components/pipeline-settings-panels';
import { PipelineStageSettings } from '@/features/opportunities/components/pipeline-settings-stage-settings';
import type {
  PipelineSettingsData,
  PipelineSettingsDraft,
} from '@/features/opportunities/components/pipeline-settings-shared';
import {
  buildPipelineSettingsPayload,
  createPipelineSettingsDraft,
  hasPipelineSettingsChanges,
} from '@/features/opportunities/components/pipeline-settings-diff';
import { PipelineSettingsSkeleton } from '@/features/opportunities/components/pipeline-settings-skeleton';
import { updatePipelineSettingsAction } from '@/server/actions/opportunities/update-pipeline-settings';

type NavSectionId = 'general' | 'stages' | 'members' | 'ownership' | 'risk';
type NavSection = {
  id: NavSectionId;
  label: string;
  icon: LucideIcon;
  activeClass?: string;
  iconClass?: string;
};

const NAV_SECTIONS: NavSection[] = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'stages', label: 'Stages', icon: ListOrdered },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'ownership', label: 'Ownership', icon: ArrowLeftRight },
  {
    id: 'risk',
    label: 'Risk',
    icon: ShieldAlert,
    activeClass: 'bg-rose-50 text-rose-700',
    iconClass: 'text-rose-600',
  },
];

type OrgMembersResponse = {
  items: TeamMemberOption[];
};

type PipelineSettingsResponse = {
  pipeline: PipelineSettingsData;
};

async function getPipelineSettings(pipelineId: string) {
  const [orgMembersResponse, pipelineResponse] = await Promise.all([
    fetch('/api/v1/org/members'),
    fetch(`/api/v1/pipelines/${pipelineId}/settings`),
  ]);

  const failedResponse = [orgMembersResponse, pipelineResponse].find(
    (response) => !response.ok,
  );
  if (failedResponse) {
    const body = (await failedResponse.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(
      body?.error ?? `Request failed with status ${failedResponse.status}.`,
    );
  }

  const [orgMembers, settings] = await Promise.all([
    orgMembersResponse.json() as Promise<OrgMembersResponse>,
    pipelineResponse.json() as Promise<PipelineSettingsResponse>,
  ]);
  const organisationMemberIds = new Set(orgMembers.items.map((member) => member.id));

  return {
    pipeline: settings.pipeline,
    members: orgMembers.items,
    assignedMemberIds: settings.pipeline.members
      .map((member) => member.id)
      .filter((id) => organisationMemberIds.has(id)),
  };
}

export function PipelineSettingsDialog({
  pipeline,
  open,
  onOpenChange,
}: {
  pipeline: PipelineListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<NavSectionId>('general');
  const [pending, startTransition] = useTransition();
  const query = useQuery({
    queryKey: ['pipeline', pipeline.id, 'settings'],
    queryFn: () => getPipelineSettings(pipeline.id),
    enabled: open && Boolean(pipeline.id),
  });
  const { data, error, isPending } = query;

  const [editState, setEditState] = useState<{
    source: typeof data | undefined;
    draft: PipelineSettingsDraft | null;
  }>({ source: undefined, draft: null });

  const baseline = useMemo(
    () => (data ? createPipelineSettingsDraft(data.pipeline) : null),
    [data],
  );
  const draft = editState.source === data ? editState.draft : baseline;

  const hasChanges =
    baseline !== null && draft !== null && hasPipelineSettingsChanges(baseline, draft);

  function updateDraft(updates: Partial<PipelineSettingsDraft>) {
    if (!draft) return;
    setEditState({ source: data, draft: { ...draft, ...updates } });
  }

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['pipeline', pipeline.id, 'settings'] });
    void queryClient.invalidateQueries({ queryKey: ['pipeline-members', pipeline.id] });
    void queryClient.invalidateQueries({ queryKey: qk.opportunities.all });
  }

  function handleOpenChange(nextOpen: boolean) {
    if (pending && !nextOpen) return;
    if (!nextOpen) {
      setEditState({ source: undefined, draft: null });
      setActiveSection('general');
    }
    onOpenChange(nextOpen);
  }

  function save() {
    if (!data || !draft || !hasChanges) return;

    startTransition(async () => {
      const result = await updatePipelineSettingsAction(
        buildPipelineSettingsPayload(data.pipeline.id, data.pipeline.version, draft),
      );

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success('Pipeline settings saved');
      invalidate();
      onOpenChange(false);
    });
  }

  const skeletonSection =
    activeSection === 'general' || activeSection === 'stages' || activeSection === 'members'
      ? activeSection
      : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(90dvh,760px)] max-w-3xl gap-0 overflow-hidden p-0">
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <aside className="shrink-0 border-b border-line bg-soft/30 sm:w-56 sm:border-b-0 sm:border-r">
            <div className="px-4 pb-2 pt-4 sm:mb-2 sm:px-5 sm:pb-3 sm:pt-5">
              <div className="flex items-center gap-1.5">
                <DialogTitle className="text-[15px] font-extrabold text-ink-900">
                  Pipeline settings
                </DialogTitle>
                <FieldHelp
                  content="Manage pipeline details, stages, members, and ownership."
                  label="Help: Pipeline settings"
                />
              </div>
              <DialogDescription className="mt-1 text-[12px] font-medium text-ink-500">
                <span
                  className="mr-1.5 inline-block size-2 rounded-full align-middle"
                  style={{
                    backgroundColor:
                      draft?.color ?? data?.pipeline.color ?? pipeline.color ?? DEFAULT_PIPELINE_COLOR,
                  }}
                  aria-hidden
                />
                Set your <span className="font-bold">{data?.pipeline.name ?? pipeline.name}</span> settings.
              </DialogDescription>
            </div>
            <nav
              aria-label="Pipeline settings sections"
              className="scroll-thin flex gap-1 overflow-x-auto px-2 pb-2.5 sm:flex-col sm:px-3 sm:pb-4"
            >
              {NAV_SECTIONS.map(({ id, label, icon: Icon, activeClass, iconClass }) => (
                <Button
                  key={id}
                  type="button"
                  variant="no-bg"
                  size="sm"
                  aria-pressed={activeSection === id}
                  className={cn(
                    'shrink-0 justify-start sm:w-full',
                    iconClass,
                    activeSection === id && (activeClass ?? 'bg-brand-50 text-brand-700'),
                  )}
                  onClick={() => setActiveSection(id)}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </Button>
              ))}
            </nav>
          </aside>

          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {data && draft ? (
              <>
                <GeneralPipelineSettingsPanel
                  key={`${pipeline.id}-general`}
                  draft={draft}
                  onDraftChange={updateDraft}
                  hidden={activeSection !== 'general'}
                />
                <PipelineStageSettings
                  key={`${pipeline.id}-stages`}
                  stages={draft.stages}
                  onStagesChange={(stages) => updateDraft({ stages })}
                  hidden={activeSection !== 'stages'}
                />
                <PipelineMembersSettingsPanel
                  key={pipeline.id}
                  hidden={activeSection !== 'members'}
                  members={data.members}
                  memberIds={draft.memberIds}
                  ownerId={draft.ownerId}
                  onMemberIdsChange={(memberIds) => updateDraft({ memberIds })}
                />
                <PipelineOwnershipSettingsPanel
                  key={`${pipeline.id}-ownership`}
                  hidden={activeSection !== 'ownership'}
                  members={data.members}
                  membersLoading={false}
                  ownerId={draft.ownerId}
                  onOwnerChange={(ownerId) => updateDraft({ ownerId })}
                />
                <PipelineRiskSettingsPanel
                  key={`${pipeline.id}-risk`}
                  pipeline={pipeline}
                  hidden={activeSection !== 'risk'}
                  onRemoved={() => onOpenChange(false)}
                />
              </>
            ) : isPending ? (
              skeletonSection ? (
                <PipelineSettingsSkeleton section={skeletonSection} />
              ) : null
            ) : (
              <p className="text-[13px] font-medium text-ink-500" role="alert">
                {error instanceof Error
                  ? error.message
                  : 'Could not load pipeline settings.'}
              </p>
            )}
          </main>
        </div>

        <div className="flex gap-2 border-t border-line bg-soft/30 px-4 py-3 sm:justify-end sm:px-6 sm:py-4">
          <Button
            type="button"
            variant="secondary"
            className="flex-1 sm:flex-none"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 sm:flex-none"
            onClick={save}
            disabled={!hasChanges || pending}
          >
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
