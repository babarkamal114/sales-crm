'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { createAccessRequestAction } from '@/server/actions/access-request';

export function RequestAccessForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="mt-6 space-y-3">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await createAccessRequestAction();
            if (!result.ok) {
              setMessage(result.error.message);
              return;
            }
            setMessage(
              result.data.alreadyPending
                ? 'Your request is already with the admin team.'
                : 'Request sent. An admin will review your access.',
            );
          });
        }}
      >
        {pending ? 'Sending…' : 'Notify admin team'}
      </Button>
      {message ? (
        <p className="text-[13px] font-medium text-ink-700" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
