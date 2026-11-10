'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ContactEmailTemplateView } from '@/domain/contacts/email-template-view';
import { htmlToPlainPreview } from '@/lib/email/html-to-plain-preview';
import { upsertContactEmailTemplateAction } from '@/server/actions/contacts/contact-email';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

export function OutreachStepTemplatePreview({
  stepKey,
  stepLabel,
  template,
  compact = false,
  onTemplateCreated,
}: {
  stepKey: string;
  stepLabel: string;
  template: ContactEmailTemplateView | null | undefined;
  compact?: boolean;
  onTemplateCreated?: (template: ContactEmailTemplateView) => void;
}) {
  const [pending, setPending] = useState(false);

  const createTemplate = async () => {
    setPending(true);
    try {
      const result = await upsertContactEmailTemplateAction({
        stepKey,
        name: stepLabel.trim() || stepKey,
        subject: 'Message from {{org_name}}',
        bodyHtml: `<p>Hi {{first_name}},</p>\n<p>Your message here.</p>\n<p>Best,<br>{{sender_name}}</p>`,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Template created');
      onTemplateCreated?.(result.data.template);
    } finally {
      setPending(false);
    }
  };

  if (!template) {
    return (
      <div
        className={
          compact
            ? 'mt-1 text-[11px] font-medium text-amber-800'
            : 'mt-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5'
        }
      >
        {!compact ? (
          <p className="text-[12px] font-bold text-amber-950">No email template for this step</p>
        ) : null}
        <p className={compact ? '' : 'mt-1 text-[12px] font-medium text-amber-900/90'}>
          Step key <span className="font-mono">{stepKey}</span> has no template yet.
        </p>
        {!compact ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-2"
            disabled={pending}
            onClick={() => void createTemplate()}
          >
            {pending ? 'Creating…' : 'Create template'}
          </Button>
        ) : null}
      </div>
    );
  }

  const preview = htmlToPlainPreview(template.bodyHtml);

  if (compact) {
    return (
      <p className="mt-1 max-w-full truncate text-[11px] font-medium text-ink-500">
        <span className="text-ink-400">Template:</span> {template.subject}
      </p>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-line/70 bg-white px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Email template</p>
          <p className="text-[13px] font-bold text-ink-900">{template.name}</p>
        </div>
        <Link
          href={`/settings/email-templates?template=${template.id}`}
          className="text-[12px] font-bold text-brand-700 hover:text-brand-800"
        >
          Edit template →
        </Link>
      </div>
      <p className="mt-2 text-[12px] font-semibold text-ink-700">
        Subject: <span className="font-medium text-ink-600">{template.subject}</span>
      </p>
      <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-ink-500">{preview}</p>
    </div>
  );
}
