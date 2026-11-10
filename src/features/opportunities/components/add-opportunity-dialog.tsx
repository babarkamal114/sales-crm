'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { PipelineListItem } from '@/domain/opportunities/card-view';
import { AddOpportunityForm } from '@/features/opportunities/components/add-opportunity-form';

export function AddOpportunityDialog({
  open,
  onOpenChange,
  pipelines,
  pipelineId,
  stageId,
  currentUserId,
  role,
  defaultContactId = null,
  defaultCompanyId = null,
  contactOptions,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelines: PipelineListItem[];
  pipelineId: string;
  stageId: string;
  currentUserId: string;
  role: string;
  defaultContactId?: string | null;
  defaultCompanyId?: string | null;
  contactOptions: { id: string; label: string }[];
  onCreated: (opportunityId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add opportunity</DialogTitle>
          <DialogDescription>
            Link a contact, set pipeline and stage, and optionally add the first next step.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <AddOpportunityForm
            pipelines={pipelines}
            initialPipelineId={pipelineId}
            initialStageId={stageId}
            currentUserId={currentUserId}
            role={role}
            defaultContactId={defaultContactId}
            initialCompanyId={defaultCompanyId}
            contactOptions={contactOptions}
            onCreated={(opportunityId) => {
              onOpenChange(false);
              onCreated(opportunityId);
            }}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
