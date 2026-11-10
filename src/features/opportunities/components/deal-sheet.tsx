'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Link2,
  Loader2,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import type { BoardFilters } from '@/domain/opportunities/filters';
import type { OpportunityListQuery } from '@/domain/opportunities/list-query';
import type { OpportunityDetailView } from '@/domain/opportunities/detail-view';
import { DealSheetOverview } from '@/features/opportunities/components/deal-sheet-overview';
import { DealSheetActivity } from '@/features/opportunities/components/deal-sheet-activity';
import { DealSheetNotes } from '@/features/opportunities/components/deal-sheet-notes';
import { DealSheetTasks } from '@/features/opportunities/components/deal-sheet-tasks';
import { useDealDetailsEdit } from '@/features/opportunities/hooks/use-deal-details-edit';
import { opportunitiesKeys } from '@/features/opportunities/query-keys';
import { deleteOpportunityAction } from '@/server/actions/opportunities/delete-opportunity';
import { formatOpportunityValue } from '@/features/opportunities/lib/format-money';
import {
  Sheet,
  SheetBody,
  SheetCloseButton,
  SheetContent,
  SheetHeader,
} from '@/components/ui/sheet';
import {
  Tabs,
  UnderlineTabsList,
  UnderlineTabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

async function fetchOpportunityDetail(
  opportunityId: string,
  filters: BoardFilters,
  listNav?: OpportunityListQuery | null,
) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.owner) params.set('owner', filters.owner);
  if (filters.status) params.set('status', filters.status);
  if (filters.sort) params.set('sort', filters.sort);
  if (listNav?.listSort) {
    params.set('listSort', listNav.listSort);
    if (listNav.listDir) params.set('listDir', listNav.listDir);
  }

  const response = await fetch(`/api/v1/opportunities/${opportunityId}?${params.toString()}`);
  if (response.status === 404) {
    throw new Error('NOT_FOUND');
  }
  if (!response.ok) throw new Error('Failed to load opportunity');
  return response.json() as Promise<{ opportunity: OpportunityDetailView }>;
}

export function DealSheet({
  dealId,
  open,
  filters,
  listNav,
  currentUserId,
  onOpenChange,
  onNavigateDeal,
}: {
  dealId: string | null;
  open: boolean;
  filters: BoardFilters;
  listNav?: OpportunityListQuery | null;
  currentUserId: string;
  onOpenChange: (open: boolean) => void;
  onNavigateDeal: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: dealId
      ? [...opportunitiesKeys.detail(dealId, filters), listNav?.listSort, listNav?.listDir]
      : ['noop-detail'],
    queryFn: () => fetchOpportunityDetail(dealId!, filters, listNav),
    enabled: open && Boolean(dealId),
  });

  const deal = data?.opportunity;
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const refreshDeal = useCallback(() => {
    void refetch();
    void queryClient.invalidateQueries({ queryKey: opportunitiesKeys.all });
  }, [queryClient, refetch]);

  const dealEdit = useDealDetailsEdit(deal, refreshDeal);

  useEffect(() => {
    if (!open) {
      setActiveTab('overview');
      setDeleteOpen(false);
    }
  }, [open, dealId]);

  const goPrev = useCallback(() => {
    if (deal?.navigation.prevId) onNavigateDeal(deal.navigation.prevId);
  }, [deal?.navigation.prevId, onNavigateDeal]);

  const goNext = useCallback(() => {
    if (deal?.navigation.nextId) onNavigateDeal(deal.navigation.nextId);
  }, [deal?.navigation.nextId, onNavigateDeal]);

  useEffect(() => {
    if (!open || !dealId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (event.key === 'j' || event.key === 'J') {
        event.preventDefault();
        goNext();
      }
      if (event.key === 'k' || event.key === 'K') {
        event.preventDefault();
        goPrev();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, dealId, goNext, goPrev]);

  const startEdit = () => {
    setActiveTab('overview');
    dealEdit.setEditing(true);
  };

  const confirmDelete = async () => {
    if (!deal) return;
    setDeletePending(true);
    try {
      const result = await deleteOpportunityAction({ opportunityId: deal.id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Deal deleted');
      setDeleteOpen(false);
      void queryClient.invalidateQueries({ queryKey: opportunitiesKeys.all });
      onOpenChange(false);
    } finally {
      setDeletePending(false);
    }
  };

  const copyLink = () => {
    void navigator.clipboard.writeText(window.location.href).then(
      () => toast.success('Link copied'),
      () => toast.error('Could not copy link'),
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader className="space-y-0">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {isLoading ? (
                <div className="flex items-center gap-2 text-[13px] font-medium text-ink-500">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Loading deal…
                </div>
              ) : deal ? (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-brand-600">
                    {deal.stage.name}
                  </p>
                  <h2 className="mt-0.5 truncate text-[18px] font-extrabold text-ink-900">
                    {deal.name}
                  </h2>
                  <p className="mt-0.5 truncate text-[13px] font-medium text-ink-500">
                    {deal.contact.displayName}
                    {' · '}
                    <span className="num font-bold text-ink-800">
                      {formatOpportunityValue(deal.valuePence, deal.currency)}
                    </span>
                  </p>
                </>
              ) : (
                <h2 className="text-[18px] font-extrabold text-ink-900">Opportunity</h2>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="icon"
                size="icon"
                aria-label="Previous deal (K)"
                disabled={!deal?.navigation.prevId}
                onClick={goPrev}
              >
                <ChevronUp className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="icon"
                size="icon"
                aria-label="Next deal (J)"
                disabled={!deal?.navigation.nextId}
                onClick={goNext}
              >
                <ChevronDown className="size-4" aria-hidden />
              </Button>
              <span className="mx-0.5 h-5 w-px bg-line/80" aria-hidden />
              <Button type="button" variant="icon" size="icon" aria-label="Copy link" onClick={copyLink}>
                <Link2 className="size-4" aria-hidden />
              </Button>
              {deal && dealEdit.canEdit ? (
                dealEdit.editing ? (
                  <>
                    <Button
                      type="button"
                      variant="icon"
                      size="icon"
                      aria-label="Save changes"
                      disabled={dealEdit.pending}
                      onClick={() => void dealEdit.save()}
                    >
                      <Check className="size-4" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      variant="icon"
                      size="icon"
                      aria-label="Cancel editing"
                      disabled={dealEdit.pending}
                      onClick={dealEdit.cancel}
                    >
                      <X className="size-4" aria-hidden />
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="icon"
                    size="icon"
                    aria-label="Edit deal"
                    onClick={startEdit}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                )
              ) : null}
              {deal ? (
                <Button
                  type="button"
                  variant="icon"
                  size="icon"
                  aria-label="Delete deal"
                  className={cn(
                    'text-ink-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700',
                  )}
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              ) : null}
              <SheetCloseButton />
            </div>
          </div>

          {deal && deal.navigation.total > 0 ? (
            <p className="mt-3 text-[11px] font-semibold text-ink-400">
              Deal {deal.navigation.index} of {deal.navigation.total}
              <span className="mx-2">·</span>
              <kbd className="rounded bg-soft px-1.5 py-0.5 font-sans text-[10px]">J</kbd>
              {' / '}
              <kbd className="rounded bg-soft px-1.5 py-0.5 font-sans text-[10px]">K</kbd>
              {' to navigate'}
            </p>
          ) : null}
        </SheetHeader>

        <SheetBody>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-brand-500" aria-hidden />
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-8 text-center">
              <p className="text-[14px] font-bold text-rose-800">
                {error instanceof Error && error.message === 'NOT_FOUND'
                  ? 'This deal is not available'
                  : 'Could not load this deal'}
              </p>
              <Button type="button" className="mt-3" variant="secondary" onClick={() => void refetch()}>
                Retry
              </Button>
            </div>
          ) : deal ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-4">
              <UnderlineTabsList className="mb-4">
                <UnderlineTabsTrigger value="overview">Overview</UnderlineTabsTrigger>
                <UnderlineTabsTrigger value="activity">Activity</UnderlineTabsTrigger>
                <UnderlineTabsTrigger value="tasks">
                  Tasks
                  {deal.openTaskCount > 0 ? (
                    <span className="ml-1.5 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                      {deal.openTaskCount}
                    </span>
                  ) : null}
                </UnderlineTabsTrigger>
                <UnderlineTabsTrigger value="notes">
                  Notes
                  {deal.noteCount > 0 ? (
                    <span className="ml-1.5 rounded-full bg-soft px-1.5 py-0.5 text-[10px] font-bold text-ink-600">
                      {deal.noteCount}
                    </span>
                  ) : null}
                </UnderlineTabsTrigger>
              </UnderlineTabsList>

              <TabsContent value="overview" className="mt-0 border-0 bg-transparent p-0">
                <DealSheetOverview
                  deal={deal}
                  editing={dealEdit.editing}
                  pending={dealEdit.pending}
                  fields={dealEdit.fields}
                />
              </TabsContent>
              <TabsContent value="activity" className="mt-0 border-0 bg-transparent p-0">
                <DealSheetActivity deal={deal} />
              </TabsContent>
              <TabsContent value="tasks" className="mt-0 border-0 bg-transparent p-0">
                <DealSheetTasks
                  deal={deal}
                  currentUserId={currentUserId}
                  onChanged={refreshDeal}
                />
              </TabsContent>
              <TabsContent value="notes" className="mt-0 border-0 bg-transparent p-0">
                <DealSheetNotes
                  deal={deal}
                  currentUserId={currentUserId}
                  onChanged={refreshDeal}
                />
              </TabsContent>
            </Tabs>
          ) : null}
        </SheetBody>
      </SheetContent>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this deal?</DialogTitle>
            <DialogDescription>
              {deal
                ? `“${deal.name}” will be removed from the pipeline. You can’t undo this from the board.`
                : 'This deal will be removed from the pipeline.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={deletePending}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deletePending}
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => void confirmDelete()}
            >
              {deletePending ? 'Deleting…' : 'Delete deal'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
