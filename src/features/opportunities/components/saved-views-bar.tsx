'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookmarkPlus, X } from 'lucide-react';
import type { SavedViewListItem } from '@/domain/opportunities/saved-view';
import { SaveViewDialog } from '@/features/opportunities/components/save-view-dialog';
import { deleteSavedViewAction } from '@/server/actions/opportunities/saved-views';
import { opportunitiesKeys } from '@/features/opportunities/query-keys';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

async function fetchSavedViews(pipelineId: string, scope: 'board' | 'list') {
  const response = await fetch(
    `/api/v1/pipelines/${pipelineId}/saved-views?scope=${scope}`,
  );
  if (!response.ok) throw new Error('Failed to load views');
  return response.json() as Promise<{ views: SavedViewListItem[] }>;
}

export function SavedViewsBar({
  pipelineId,
  scope,
  activeSavedViewId,
  canShareWithTeam,
  onApplyDefault,
  onApplyView,
  captureFilters,
}: {
  pipelineId: string;
  scope: 'board' | 'list' | 'forecast';
  activeSavedViewId: string | null;
  canShareWithTeam: boolean;
  onApplyDefault: () => void;
  onApplyView: (view: SavedViewListItem) => void;
  captureFilters: () => import('@/domain/opportunities/saved-view').SavedViewFilters;
}) {
  const queryClient = useQueryClient();
  const [saveOpen, setSaveOpen] = useState(false);
  const listScope = scope === 'list' ? 'list' : 'board';

  const { data } = useQuery({
    queryKey: opportunitiesKeys.savedViews(pipelineId, listScope),
    queryFn: () => fetchSavedViews(pipelineId, listScope),
    enabled: scope !== 'forecast',
  });

  if (scope === 'forecast') return null;

  const views = data?.views ?? [];

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: opportunitiesKeys.savedViews(pipelineId, listScope),
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={cn(
            'h-8 rounded-full px-3.5 text-[12px] font-semibold transition-colors',
            !activeSavedViewId
              ? 'bg-ink-900 text-white'
              : 'bg-soft text-ink-600 hover:text-ink-900',
          )}
          onClick={onApplyDefault}
        >
          All deals
        </button>
        {views.map((view) => {
          const active = activeSavedViewId === view.id;
          return (
            <span key={view.id} className="inline-flex items-center">
              <button
                type="button"
                className={cn(
                  'h-8 rounded-l-full pl-3.5 pr-2 text-[12px] font-semibold transition-colors',
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'bg-soft text-ink-600 hover:text-ink-900',
                )}
                onClick={() => onApplyView(view)}
              >
                {view.name}
                {view.isShared ? (
                  <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide opacity-80">
                    Team
                  </span>
                ) : null}
              </button>
              {view.canDelete ? (
                <button
                  type="button"
                  className={cn(
                    'grid h-8 w-7 place-items-center rounded-r-full border-l border-line/60 transition-colors',
                    active ? 'bg-brand-50 text-brand-700' : 'bg-soft text-ink-500 hover:text-rose-600',
                  )}
                  aria-label={`Remove saved view ${view.name}`}
                  onClick={() => {
                    void (async () => {
                      const result = await deleteSavedViewAction(view.id);
                      if (!result.ok) {
                        toast.error(result.error.message);
                        return;
                      }
                      toast.message('View removed');
                      if (activeSavedViewId === view.id) onApplyDefault();
                      invalidate();
                    })();
                  }}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              ) : (
                <span
                  className={cn(
                    'h-8 w-1 rounded-r-full',
                    active ? 'bg-brand-50' : 'bg-soft',
                  )}
                />
              )}
            </span>
          );
        })}
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-ink-300 px-3 text-[12px] font-semibold text-ink-500 hover:border-brand-400 hover:text-brand-600"
          onClick={() => setSaveOpen(true)}
        >
          <BookmarkPlus className="size-3.5" aria-hidden />
          Save view
        </button>
      </div>

      <SaveViewDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        pipelineId={pipelineId}
        scope={listScope}
        filters={captureFilters()}
        canShareWithTeam={canShareWithTeam}
        onSaved={(id, viewName, shared) => {
          invalidate();
          onApplyView({
            id,
            name: viewName,
            scope: listScope,
            pipelineId,
            filters: captureFilters(),
            isMine: !shared,
            isShared: shared,
            canDelete: shared ? canShareWithTeam : true,
          });
        }}
      />
    </>
  );
}
