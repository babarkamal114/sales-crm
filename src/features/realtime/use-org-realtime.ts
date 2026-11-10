'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { OrgAffectedEvent } from '@/lib/realtime/org-affected-event';
import { applyAffected } from '@/lib/entities/invalidate';

/** Subscribes to org SSE and refreshes caches for colleagues' changes. */
export function useOrgRealtime(userId: string, enabled = true) {
  const queryClient = useQueryClient();
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const source = new EventSource('/api/v1/realtime/stream');

    source.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data) as OrgAffectedEvent | { type: 'connected' };
        if (data.type !== 'entities.affected') return;
        if (data.actorId === userId) return;
        if (seenRef.current.has(data.id)) return;
        seenRef.current.add(data.id);
        if (seenRef.current.size > 500) {
          seenRef.current.clear();
        }
        applyAffected(queryClient, data.affected);
      } catch {
        // ignore malformed
      }
    };

    return () => {
      source.close();
    };
  }, [enabled, queryClient, userId]);
}
