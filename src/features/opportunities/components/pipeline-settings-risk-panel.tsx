'use client';

import { useState, useTransition } from 'react';
import { Archive, ShieldAlert } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PipelineListItem } from '@/domain/opportunities/card-view';
import { Button } from '@/components/ui/button';
import { FieldHelp } from '@/components/ui/field-help';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { qk } from '@/lib/query-keys';
import { archivePipelineAction } from '@/server/actions/opportunities/archive-pipeline';
import { deletePipelineAction } from '@/server/actions/opportunities/delete-pipeline';
import type { SettingsPanelProps } from '@/features/opportunities/components/pipeline-settings-shared';

type RiskPanelProps = SettingsPanelProps & {
  pipeline: PipelineListItem;
  onRemoved: () => void;
};

export function PipelineRiskSettingsPanel({
  pipeline,
  hidden,
  onRemoved,
}: RiskPanelProps) {
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null);
  const [pending, startTransition] = useTransition();

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: qk.opportunities.all });
    void queryClient.invalidateQueries({ queryKey: ['pipeline', pipeline.id, 'settings'] });
    void queryClient.invalidateQueries({ queryKey: ['pipeline-members', pipeline.id] });
  }

  function confirm() {
    if (!confirmAction) return;
    const action = confirmAction;

    startTransition(async () => {
      const result = action === 'archive'
        ? await archivePipelineAction({ pipelineId: pipeline.id })
        : await deletePipelineAction({ pipelineId: pipeline.id });

      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }

      toast.success(action === 'archive' ? 'Pipeline archived' : 'Pipeline deleted');
      setConfirmAction(null);
      invalidate();
      onRemoved();
    });
  }

  return (
    <section hidden={hidden} className="space-y-5 text-ink-700">
      <div>
        <div className="flex items-center gap-1.5">
          <h3 className="text-[15px] font-bold text-ink-900">Risk</h3>
          <FieldHelp
            content="Actions in this section can remove or change important pipeline data."
            label="Help: Risk"
          />
        </div>
        <p className="mt-1 text-[12px] font-medium text-ink-500">
          Destructive actions for this pipeline.
        </p>
      </div>

      <div className="rounded-2xl border border-line p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-start gap-3">
            <Archive className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <h4 className="text-[13px] font-bold text-ink-900">Archive pipeline</h4>
                <FieldHelp
                  content="Hides the pipeline without removing any deals or history."
                  label="Help: Archive pipeline"
                />
              </div>
              <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink-500">
                Soft-delete {pipeline.name}. Its deals stay in the database.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start sm:self-auto"
            onClick={() => setConfirmAction('archive')}
          >
            Archive pipeline
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-line p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-rose-600" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <h4 className="text-[13px] font-bold text-ink-900">Delete pipeline</h4>
                <FieldHelp
                  content="Review the effects on opportunities before proceeding."
                  label="Help: Delete pipeline"
                />
              </div>
              <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink-500">
                Permanently delete {pipeline.name}, its stages, members and all of its deals.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="self-start sm:self-auto"
            onClick={() => setConfirmAction('delete')}
          >
            Delete pipeline
          </Button>
        </div>
      </div>

      <Dialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirmAction(null);
        }}
      >
        <DialogContent className="max-w-md p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'archive' ? `Archive ${pipeline.name}?` : `Delete ${pipeline.name}?`}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'archive'
                ? 'The pipeline will be hidden from selection. Its deals and history are kept.'
                : 'This cannot be undone. The pipeline, its stages, members and every deal in it will be permanently removed.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirmAction === 'delete' ? 'destructive' : 'primary'}
              disabled={pending}
              onClick={confirm}
            >
              {pending
                ? 'Working…'
                : confirmAction === 'archive'
                  ? 'Archive pipeline'
                  : 'Confirm delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
