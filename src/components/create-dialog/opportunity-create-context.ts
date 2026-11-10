'use client';

import { useEffect } from 'react';
import { useCreateDialogRegistration } from '@/components/create-dialog';

export type OpportunityCreateContext = {
  pipelineId: string | null;
  focusedStageId: string | null;
  fallbackStageId: string | null;
  view: 'board' | 'list' | 'forecast';
};

export function useRegisterOpportunityCreateContext(ctx: OpportunityCreateContext | null) {
  const setContext = useCreateDialogRegistration();
  useEffect(() => {
    setContext(ctx);
    return () => setContext(null);
  }, [ctx, setContext]);
}
