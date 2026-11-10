'use client';

import { useEffect, useState } from 'react';

export function useDebouncedUrlParam(
  value: string | undefined,
  onCommit: (next: string | null) => void,
  delayMs = 200,
) {
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const trimmed = draft.trim();
      const committed = value?.trim() ?? '';
      if (trimmed !== committed) {
        onCommit(trimmed || null);
      }
    }, delayMs);
    return () => window.clearTimeout(handle);
  }, [draft, delayMs, onCommit, value]);

  return { draft, setDraft };
}
