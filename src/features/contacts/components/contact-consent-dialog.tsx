'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { ChannelConsent, ConsentChannel, MarketingConsentState } from '@/domain/contacts/consent';
import { CONSENT_CHANNELS } from '@/domain/contacts/quick-view';
import { setContactConsentAction } from '@/server/actions/contacts/update-contact';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const CHANNEL_LABEL: Record<ConsentChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  call: 'Calls',
  whatsapp: 'WhatsApp',
};

export function ContactConsentDialog({
  open,
  onOpenChange,
  contactId,
  version,
  preferences,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  version: number;
  preferences: ChannelConsent[];
  onSaved: () => void;
}) {
  const [channel, setChannel] = useState<ConsentChannel>('email');
  const [dnd, setDnd] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState<MarketingConsentState>('unknown');
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const row = preferences.find((item) => item.channel === channel);
    setDnd(row?.dnd ?? false);
    setMarketingConsent(row?.marketingConsent ?? 'unknown');
    setReason('');
  }, [channel, preferences, open]);

  const save = () => {
    startTransition(async () => {
      const result = await setContactConsentAction({
        contactId,
        version,
        channel,
        dnd,
        marketingConsent,
        reason: reason.trim() || undefined,
        source: 'Manual',
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Contact preferences updated');
      onOpenChange(false);
      onSaved();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contact preferences</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5 py-1">
          {CONSENT_CHANNELS.map((item) => (
            <button
              key={item}
              type="button"
              className={
                channel === item
                  ? 'rounded-lg bg-brand-600 px-2.5 py-1 text-[12px] font-semibold text-white'
                  : 'rounded-lg bg-soft px-2.5 py-1 text-[12px] font-semibold text-ink-600'
              }
              onClick={() => setChannel(item)}
            >
              {CHANNEL_LABEL[item]}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[13px] font-medium text-ink-800">
          <input type="checkbox" checked={dnd} onChange={(event) => setDnd(event.target.checked)} />
          Do not contact on {CHANNEL_LABEL[channel].toLowerCase()}
        </label>
        <label className="block text-[12px] font-semibold text-ink-500">Marketing consent</label>
        <select
          className="h-9 w-full rounded-lg border border-line bg-white px-2 text-[13px]"
          value={marketingConsent}
          onChange={(event) =>
            setMarketingConsent(event.target.value as MarketingConsentState)
          }
        >
          <option value="unknown">Unknown</option>
          <option value="granted">Consent given</option>
          <option value="denied">Opted out</option>
        </select>
        <Input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason (optional)"
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={save}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
