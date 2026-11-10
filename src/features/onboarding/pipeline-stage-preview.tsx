import { DEFAULT_PIPELINE_STAGES } from '@/domain/pipeline/default-stages';

export function PipelineStagePreview() {
  const stages = [
    ...DEFAULT_PIPELINE_STAGES.filter((s) => s.kind === 'open'),
    ...DEFAULT_PIPELINE_STAGES.filter((s) => s.kind !== 'open'),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {stages.map((stage, i) => (
          <div key={stage.name} className="flex items-center gap-2">
            <span
              className={
                stage.kind === 'won'
                  ? 'rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11.5px] font-bold text-brand-800'
                  : 'rounded-full border border-line bg-white px-3 py-1.5 text-[11.5px] font-bold text-ink-600'
              }
            >
              {stage.name}
            </span>
            {i < stages.length - 1 ? (
              <span className="hidden text-ink-300 sm:inline" aria-hidden>
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <div className="rounded-xl2 border border-dashed border-line/80 bg-soft/40 p-4">
        <p className="text-[12.5px] font-medium leading-relaxed text-ink-600">
          Each opportunity moves through these stages. You can rename stages, add
          custom fields, and set renewal reminders in{' '}
          <span className="font-bold text-ink-800">Settings → Pipeline</span>{' '}
          after setup.
        </p>
      </div>
    </div>
  );
}
