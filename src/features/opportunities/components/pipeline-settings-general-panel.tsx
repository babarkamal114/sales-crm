'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type {
  PipelineSettingsDraft,
  SettingsPanelProps,
} from '@/features/opportunities/components/pipeline-settings-shared';
import { FieldHelp } from '@/components/ui/field-help';
import { Switch } from '@/components/ui/switch';
import { DEFAULT_PIPELINE_COLOR, PIPELINE_COLOR_OPTIONS } from '@/domain/pipeline/colors';

type GeneralPipelineSettingsPanelProps = SettingsPanelProps & {
  draft: PipelineSettingsDraft;
  onDraftChange: (updates: Partial<PipelineSettingsDraft>) => void;
};

export function GeneralPipelineSettingsPanel({
  hidden,
  draft,
  onDraftChange,
}: GeneralPipelineSettingsPanelProps) {
  const color = draft.color ?? DEFAULT_PIPELINE_COLOR;
  const selectedColor = PIPELINE_COLOR_OPTIONS.find(
    (option) => option.value === color.toUpperCase(),
  );

  return (
    <section hidden={hidden} className="space-y-6 text-ink-700">
      <div>
        <div className="flex items-center gap-1.5">
          <h3 className="text-[15px] font-bold text-ink-900">Pipeline information</h3>
          <FieldHelp
            content="Set the details people use to identify and select this pipeline."
            label="Help: Pipeline information"
          />
        </div>
        <p className="mt-1 text-[12px] font-medium text-ink-500">
          Update the name, slug, colour, and default status.
        </p>
      </div>

      <div className="max-w-xl space-y-2">
        <div className="flex items-center gap-1">
          <Label htmlFor="pipeline-settings-name">Pipeline name</Label>
          <FieldHelp
            content="This name appears when people view or select the pipeline."
            label="Help: Pipeline name"
          />
        </div>
        <Input
          id="pipeline-settings-name"
          value={draft.name}
          onChange={(event) => onDraftChange({ name: event.target.value })}
          maxLength={120}
        />
      </div>

      <div className="max-w-xl space-y-2">
        <div className="flex items-center gap-1">
          <Label htmlFor="pipeline-settings-slug">Pipeline slug</Label>
          <FieldHelp
            content="Slugs must be unique within your organisation."
            label="Help: Pipeline slug"
          />
        </div>
        <Input
          id="pipeline-settings-slug"
          value={draft.slug}
          onChange={(event) => onDraftChange({ slug: event.target.value })}
          maxLength={120}
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-800">
          Pipeline colour
          <FieldHelp
            content="Choose a colour to distinguish this pipeline in the interface."
            label="Help: Pipeline colour"
          />
        </legend>
        <p className="text-[12px] text-ink-500">
          This colour appears in the pipeline picker.
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2" role="group" aria-label="Pipeline colour">
          {PIPELINE_COLOR_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-label={`Set pipeline colour to ${option.label}`}
              aria-pressed={color.toUpperCase() === option.value}
              title={option.label}
              className={cn(
                'size-7 rounded-full border border-ink-900/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
                color.toUpperCase() === option.value && 'ring-2 ring-brand-500 ring-offset-2',
              )}
              style={{ backgroundColor: option.value }}
              onClick={() => onDraftChange({ color: option.value })}
            />
          ))}
          <Input
            type="color"
            value={color.toLowerCase()}
            aria-label="Choose custom pipeline colour"
            className="size-8 cursor-pointer rounded-lg border border-line bg-white p-1"
            onChange={(event) => onDraftChange({ color: event.target.value.toUpperCase() })}
          />
          <span className="text-[12px] font-medium text-ink-600">
            {selectedColor?.label ?? color.toUpperCase()}
          </span>
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-6 rounded-xl border border-line bg-white px-4 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-semibold text-ink-800">Default pipeline</p>
            <FieldHelp content="Use this pipeline as the default when creating opportunities." />
          </div>
        </div>
        <Switch
          id="pipeline-settings-default"
          checked={draft.isDefault}
          onCheckedChange={(checked) => onDraftChange({ isDefault: checked })}
          aria-label="Set as default pipeline"
          className="shrink-0"
        />
      </div>
    </section>
  );
}
