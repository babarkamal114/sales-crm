'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import type { ContactEmailTemplateView } from '@/domain/contacts/email-template-view';
import { normaliseCustomStepKey } from '@/domain/contacts/email-template-steps';
import { htmlToPlainPreview } from '@/lib/email/html-to-plain-preview';
import { upsertContactEmailTemplateAction } from '@/server/actions/contacts/contact-email';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';

const CREATE_VALUE = '__create_custom__';

export function OutreachStepEmailTemplateField({
  stepKey,
  stepLabel,
  templates,
  onStepKeyChange,
  onTemplateCreated,
}: {
  stepKey: string;
  stepLabel: string;
  templates: ContactEmailTemplateView[];
  onStepKeyChange: (stepKey: string) => void;
  onTemplateCreated: (template: ContactEmailTemplateView) => void;
}) {
  const selectId = useId();
  const [createOpen, setCreateOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customStepKey, setCustomStepKey] = useState(stepKey);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setCustomStepKey(stepKey);
  }, [stepKey]);

  const openCreate = () => {
    setCustomName(stepLabel.trim() || 'Custom email');
    setCustomStepKey(stepKey.trim() || `custom_${Date.now()}`);
    setCreateOpen(true);
  };

  const onSelectChange = (value: string) => {
    if (value === CREATE_VALUE) {
      openCreate();
      return;
    }
    onStepKeyChange(value);
  };

  const submitCustom = async () => {
    const key = normaliseCustomStepKey(customStepKey);
    const name = customName.trim();
    if (!key || key.length < 2) {
      toast.error('Step key must be at least 2 characters');
      return;
    }
    if (!name) {
      toast.error('Template name is required');
      return;
    }
    setPending(true);
    try {
      const existing = templates.find((template) => template.stepKey === key);
      const result = await upsertContactEmailTemplateAction(
        existing
          ? {
              templateId: existing.id,
              stepKey: key,
              name,
              subject: existing.subject,
              bodyHtml: existing.bodyHtml,
            }
          : {
              stepKey: key,
              name,
              subject: 'Message from {{org_name}}',
              bodyHtml: `<p>Hi {{first_name}},</p>\n<p>Your message here.</p>\n<p>Best,<br>{{sender_name}}</p>`,
            },
      );
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      onTemplateCreated(result.data.template);
      onStepKeyChange(result.data.template.stepKey);
      setCreateOpen(false);
      toast.success(existing ? 'Template updated' : 'Custom template created');
    } finally {
      setPending(false);
    }
  };

  const activeTemplate = templates.find((template) => template.stepKey === stepKey) ?? null;
  const preview = activeTemplate ? htmlToPlainPreview(activeTemplate.bodyHtml) : null;

  return (
    <div className="mt-3 space-y-2 sm:col-span-2">
      <label className="block text-[12px] font-bold text-ink-500" htmlFor={selectId}>
        Email template
      </label>
      <select
        id={selectId}
        className="h-10 w-full rounded-lg border border-line bg-white px-3 text-[13px] font-medium text-ink-900"
        value={activeTemplate?.stepKey ?? ''}
        onChange={(event) => onSelectChange(event.target.value)}
      >
        {!activeTemplate ? (
          <option value="">Choose a template…</option>
        ) : null}
        {[...templates]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((template) => (
            <option key={template.id} value={template.stepKey}>
              {template.name} ({template.stepKey})
            </option>
          ))}
        <option value={CREATE_VALUE}>+ Create custom template for this step</option>
      </select>

      {!activeTemplate && stepKey ? (
        <p className="text-[12px] font-medium text-amber-800">
          No template for step key <span className="font-mono">{stepKey}</span> — pick one above or
          create custom.
        </p>
      ) : null}

      {activeTemplate ? (
        <div className="rounded-lg border border-line/70 bg-white px-3 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-[13px] font-bold text-ink-900">{activeTemplate.subject}</p>
            <Link
              href={`/settings/email-templates?template=${activeTemplate.id}`}
              className="shrink-0 text-[12px] font-bold text-brand-700 hover:text-brand-800"
            >
              Edit content →
            </Link>
          </div>
          {preview ? (
            <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-ink-500">{preview}</p>
          ) : null}
        </div>
      ) : null}

      <Dialog open={createOpen} onOpenChange={(open) => !pending && setCreateOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Custom template for this step</DialogTitle>
            <DialogDescription>
              Creates an org template and links it to this step. Edit subject and body on the email
              templates page afterward.
            </DialogDescription>
          </DialogHeader>
          <label className="block space-y-1.5">
            <span className="text-[12px] font-semibold text-ink-500">Template name</span>
            <input
              className="h-10 w-full rounded-xl border border-line px-3 text-[13px]"
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[12px] font-semibold text-ink-500">Step key (unique id)</span>
            <input
              className="h-10 w-full rounded-xl border border-line px-3 font-mono text-[13px]"
              value={customStepKey}
              onChange={(event) => setCustomStepKey(event.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={() => void submitCustom()}>
              {pending ? 'Saving…' : 'Create & link'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
