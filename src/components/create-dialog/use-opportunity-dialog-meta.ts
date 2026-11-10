import { useEffect, useMemo, useState } from 'react';
import type { PipelineListItem } from '@/domain/opportunities/card-view';
import type { CreateOpportunityPrefill } from '@/lib/entities/create-prefill';
import { fetchFirstStageId, pickOpportunityPipelineId } from '@/components/create-dialog/create-dialog-pipelines';

type OpportunityDialogMeta = {
  pipelineId: string;
  stageId: string;
  contactOptions: { id: string; label: string }[];
};

export function useOpportunityDialogMeta(
  open: boolean,
  prefill: CreateOpportunityPrefill,
  pipelines: PipelineListItem[],
): OpportunityDialogMeta {
  const pipelineId = useMemo(
    () => (open ? pickOpportunityPipelineId(prefill, pipelines) : ''),
    [open, prefill, pipelines],
  );

  const [stageId, setStageId] = useState('');

  useEffect(() => {
    if (!open || !pipelineId) {
      setStageId('');
      return;
    }
    if (prefill.stageId) {
      setStageId(prefill.stageId);
      return;
    }

    let cancelled = false;
    void fetchFirstStageId(pipelineId).then((id) => {
      if (!cancelled && id) setStageId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [open, prefill.stageId, pipelineId]);

  const contactOptions = useMemo(() => {
    const id = prefill.contactId;
    if (!id) return [];
    return [{ id, label: 'Selected contact' }];
  }, [prefill.contactId]);

  return { pipelineId, stageId, contactOptions };
}
