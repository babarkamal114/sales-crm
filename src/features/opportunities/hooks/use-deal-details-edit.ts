'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OpportunityDetailView } from '@/domain/opportunities/detail-view';
import { updateOpportunityAction } from '@/server/actions/opportunities/update-opportunity';
import { toast } from '@/components/ui/sonner';

export function useDealDetailsEdit(deal: OpportunityDetailView | undefined, onUpdated: () => void) {
  const canEdit = deal?.status === 'open';
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [valuePounds, setValuePounds] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!deal) return;
    setName(deal.name);
    setValuePounds(deal.valuePence != null ? String(deal.valuePence / 100) : '');
    setCloseDate(deal.expectedCloseDate ?? '');
    setEditing(false);
  }, [deal?.id, deal?.name, deal?.valuePence, deal?.expectedCloseDate, deal]);

  const cancel = useCallback(() => {
    if (!deal) return;
    setName(deal.name);
    setValuePounds(deal.valuePence != null ? String(deal.valuePence / 100) : '');
    setCloseDate(deal.expectedCloseDate ?? '');
    setEditing(false);
  }, [deal]);

  const save = useCallback(async () => {
    if (!deal) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Deal name is required');
      return;
    }
    let valuePence: number | null | undefined;
    if (valuePounds.trim() === '') {
      valuePence = null;
    } else {
      const parsed = Math.round(Number.parseFloat(valuePounds) * 100);
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast.error('Enter a valid value');
        return;
      }
      valuePence = parsed;
    }

    setPending(true);
    try {
      const result = await updateOpportunityAction({
        opportunityId: deal.id,
        version: deal.version,
        name: trimmed,
        valuePence,
        expectedCloseDate: closeDate.trim() ? closeDate.trim() : null,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Deal updated');
      setEditing(false);
      onUpdated();
    } finally {
      setPending(false);
    }
  }, [deal, name, valuePounds, closeDate, onUpdated]);

  return {
    canEdit: Boolean(canEdit),
    editing,
    setEditing,
    pending,
    save,
    cancel,
    fields: { name, setName, valuePounds, setValuePounds, closeDate, setCloseDate },
  };
}
