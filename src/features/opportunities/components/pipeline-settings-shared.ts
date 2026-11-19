import type { TeamMemberOption } from '@/domain/opportunities/detail-view';
import type { EditablePipelineStage } from '@/features/opportunities/components/pipeline-settings-stage-types';

export type SettingsPanelProps = {
  hidden: boolean;
};

export type PipelineSettingsData = {
  id: string;
  name: string;
  slug: string;
  color: string;
  position: number;
  isDefault: boolean;
  version: number;
  createdBy: string;
  stages: EditablePipelineStage[];
  members: { id: string }[];
};

export type PipelineSettingsDraft = {
  name: string;
  slug: string;
  color: string;
  isDefault: boolean;
  ownerId: string;
  memberIds: string[];
  stages: EditablePipelineStage[];
};

export interface PipelineMembersSettingsProps extends SettingsPanelProps {
  members: TeamMemberOption[];
  memberIds: string[];
  ownerId: string;
  onMemberIdsChange: (memberIds: string[]) => void;
}
