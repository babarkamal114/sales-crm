'use client';

import { useEffect } from 'react';

type ContactsKeyboardOptions = {
  onFocusSearch: () => void;
  onAddContact: () => void;
  onOpenRow?: (index: number) => void;
  onToggleSelectRow?: (index: number) => void;
  rowCount: number;
  focusedRowIndex: number;
  setFocusedRowIndex: (index: number) => void;
  enabled?: boolean;
};

export function useContactsKeyboard({
  onFocusSearch,
  onAddContact,
  onOpenRow,
  onToggleSelectRow,
  rowCount,
  focusedRowIndex,
  setFocusedRowIndex,
  enabled = true,
}: ContactsKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      const inField =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable;

      if (event.key === '/' && !inField && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        onFocusSearch();
        return;
      }

      if ((event.key === 'n' || event.key === 'N') && !inField && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        onAddContact();
        return;
      }

      if (inField || rowCount === 0) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusedRowIndex(Math.min(focusedRowIndex + 1, rowCount - 1));
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusedRowIndex(Math.max(focusedRowIndex - 1, 0));
        return;
      }
      if (event.key === 'Enter' && onOpenRow) {
        event.preventDefault();
        onOpenRow(focusedRowIndex);
        return;
      }
      if (event.key === ' ' && onToggleSelectRow) {
        event.preventDefault();
        onToggleSelectRow(focusedRowIndex);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    enabled,
    focusedRowIndex,
    onAddContact,
    onFocusSearch,
    onOpenRow,
    onToggleSelectRow,
    rowCount,
    setFocusedRowIndex,
  ]);
}
