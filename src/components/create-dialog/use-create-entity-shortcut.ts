import { useEffect, type RefObject } from 'react';
import type { OpportunityCreateContext } from '@/components/create-dialog/opportunity-create-context';
import type { CreateDialogContextValue } from '@/components/create-dialog/create-dialog-types';

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    el.isContentEditable
  );
}

/** Board route: `N` opens new opportunity with pipeline/stage from board context. */
export function useCreateEntityShortcut(
  pathname: string,
  opportunityCreateRef: RefObject<OpportunityCreateContext | null>,
  openCreateRef: RefObject<CreateDialogContextValue['openCreate']>,
): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'n' && event.key !== 'N') return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;
      if (!pathname.startsWith('/opportunities')) return;

      event.preventDefault();
      const ctx = opportunityCreateRef.current;
      const pipelineId = ctx?.pipelineId ?? undefined;
      const stageId = ctx?.focusedStageId ?? ctx?.fallbackStageId ?? undefined;
      openCreateRef.current('opportunity', {
        ...(pipelineId ? { pipelineId } : {}),
        ...(stageId ? { stageId } : {}),
      });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pathname, opportunityCreateRef, openCreateRef]);
}
