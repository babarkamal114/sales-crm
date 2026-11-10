'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from '@/components/ui/sonner';
import type { MessageChannel } from '@/domain/conversations/types';
import { openConversationForContact } from '@/features/conversations/lib/open-conversation-for-contact';
import { cn } from '@/lib/utils';

type OpenConversationButtonProps = {
  contactId: string;
  channel?: MessageChannel;
  disabled?: boolean;
  title?: string;
  className?: string;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent) => void;
};

export function OpenConversationButton({
  contactId,
  channel,
  disabled,
  title,
  className,
  children,
  onClick,
}: OpenConversationButtonProps) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={disabled || pending}
      title={title}
      className={cn(className, pending && 'opacity-60')}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        start(async () => {
          const ok = await openConversationForContact(router, contactId, channel);
          if (!ok) toast.error('Could not open conversation for this contact.');
        });
      }}
    >
      {children}
    </button>
  );
}
