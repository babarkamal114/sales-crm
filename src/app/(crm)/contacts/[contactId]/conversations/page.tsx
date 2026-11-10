'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
export default function ContactConversationsRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const contactId = params.contactId as string;
  const channel = searchParams.get('channel');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const q = new URLSearchParams();
      if (
        channel === 'email' ||
        channel === 'sms' ||
        channel === 'whatsapp'
      ) {
        q.set('channel', channel);
      }
      const response = await fetch(
        `/api/v1/conversations/by-contact/${contactId}?${q.toString()}`,
      );
      if (cancelled) return;
      if (response.ok) {
        const data = (await response.json()) as { href: string };
        router.replace(data.href);
        return;
      }
      router.replace('/conversations');
    })();
    return () => {
      cancelled = true;
    };
  }, [contactId, channel, router]);

  return (
    <p className="px-6 py-12 text-center text-[13px] text-ink-500">Opening conversation…</p>
  );
}
