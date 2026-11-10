'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { mergeCompaniesAction } from '@/server/actions/companies/company-lifecycle';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type CompanyPick = {
  id: string;
  name: string;
  domain: string | null;
};

async function fetchQuick(companyId: string) {
  const response = await fetch(`/api/v1/companies/${companyId}/quick`);
  if (!response.ok) throw new Error('Failed to load company');
  const data = (await response.json()) as {
    company: { version: number; name: string; domain: string | null };
  };
  return data.company;
}

export function MergeCompaniesDialog({
  open,
  onOpenChange,
  companies,
  onMerged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: [CompanyPick, CompanyPick];
  onMerged: (survivingId: string) => void;
}) {
  const [primaryId, setPrimaryId] = useState(companies[0].id);
  const [pending, startTransition] = useTransition();

  const secondaryId = companies[0].id === primaryId ? companies[1].id : companies[0].id;

  const { data: primaryQuick } = useQuery({
    queryKey: ['company-quick', primaryId, 'merge'],
    queryFn: () => fetchQuick(primaryId),
    enabled: open,
  });

  const merge = () => {
    if (!primaryQuick?.version) {
      toast.error('Still loading company details…');
      return;
    }
    startTransition(async () => {
      const result = await mergeCompaniesAction({
        primaryCompanyId: primaryId,
        secondaryCompanyId: secondaryId,
        primaryVersion: primaryQuick.version,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Companies merged');
      onOpenChange(false);
      onMerged(result.data.survivingId);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Merge companies</DialogTitle>
        </DialogHeader>
        <p className="text-[13px] text-ink-600">
          Choose the company record to keep. People, deals, domains, and tags from the other
          company move into the survivor.
        </p>
        <ul className="space-y-2">
          {companies.map((row) => (
            <li key={row.id}>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-line px-3 py-2">
                <input
                  type="radio"
                  name="merge-primary-company"
                  checked={primaryId === row.id}
                  onChange={() => setPrimaryId(row.id)}
                />
                <span className="text-[13px]">
                  <b className="block text-ink-900">{row.name}</b>
                  <span className="text-ink-500">{row.domain ?? 'No domain'}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || !primaryQuick} onClick={merge}>
            Merge
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
