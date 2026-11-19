import { describe, expect, it } from 'vitest';
import type { PipelineSettingsData } from '@/features/opportunities/components/pipeline-settings-shared';
import {
  buildPipelineSettingsPayload,
  createPipelineSettingsDraft,
  hasPipelineSettingsChanges,
} from '@/features/opportunities/components/pipeline-settings-diff';

const settings: PipelineSettingsData = {
  id: '2c8f8e2e-9b0d-4f3a-9f2a-1f2f1a1b1c1d',
  name: 'Sales pipeline',
  slug: 'sales',
  color: '#3B82F6',
  position: 0,
  isDefault: true,
  version: 3,
  createdBy: '3c8f8e2e-9b0d-4f3a-9f2a-1f2f1a1b1c1d',
  stages: [
    {
      id: '4c8f8e2e-9b0d-4f3a-9f2a-1f2f1a1b1c1d',
      name: 'New lead',
      kind: 'open',
      position: 0,
      probability: 10,
      rottingDays: 7,
      version: 1,
    },
    {
      id: '5c8f8e2e-9b0d-4f3a-9f2a-1f2f1a1b1c1d',
      name: 'Won',
      kind: 'won',
      position: 1,
      probability: 100,
      rottingDays: null,
      version: 1,
    },
  ],
  members: [
    { id: '3c8f8e2e-9b0d-4f3a-9f2a-1f2f1a1b1c1d' },
    { id: '6c8f8e2e-9b0d-4f3a-9f2a-1f2f1a1b1c1d' },
  ],
};

function setup() {
  const baseline = createPipelineSettingsDraft(settings);
  return { baseline, draft: createPipelineSettingsDraft(settings) };
}

describe('pipeline settings diff', () => {
  it('reports no changes for an untouched draft', () => {
    const { baseline, draft } = setup();
    expect(hasPipelineSettingsChanges(baseline, draft)).toBe(false);
  });

  it('detects changed pipeline fields', () => {
    const { baseline, draft } = setup();
    draft.name = 'Renamed pipeline';
    expect(hasPipelineSettingsChanges(baseline, draft)).toBe(true);
  });

  it('detects colour changes', () => {
    const { baseline, draft } = setup();
    draft.color = '#E11D48';
    expect(hasPipelineSettingsChanges(baseline, draft)).toBe(true);
  });

  it('detects stage edits and reordering', () => {
    const { baseline, draft } = setup();
    draft.stages = [draft.stages[1]!, draft.stages[0]!].map((stage, position) => ({
      ...stage,
      position,
    }));
    expect(hasPipelineSettingsChanges(baseline, draft)).toBe(true);
  });

  it('ignores member ordering', () => {
    const { baseline, draft } = setup();
    draft.memberIds = [...draft.memberIds].reverse();
    expect(hasPipelineSettingsChanges(baseline, draft)).toBe(false);
  });

  it('detects ownership changes', () => {
    const { baseline, draft } = setup();
    draft.ownerId = '6c8f8e2e-9b0d-4f3a-9f2a-1f2f1a1b1c1d';
    expect(hasPipelineSettingsChanges(baseline, draft)).toBe(true);
  });

  it('builds a payload with the current version and ordered stages', () => {
    const { draft } = setup();
    const payload = buildPipelineSettingsPayload(settings.id, settings.version, draft);

    expect(payload.pipelineId).toBe(settings.id);
    expect(payload.version).toBe(settings.version);
    expect(payload.color).toBe(settings.color);
    expect(payload.stages.map((stage) => stage.position)).toEqual([0, 1]);
  });
});
