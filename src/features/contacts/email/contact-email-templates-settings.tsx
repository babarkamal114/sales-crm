'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ContactEmailTemplateView } from '@/domain/contacts/email-template-view';
import {
  EMAIL_MERGE_TOKEN_HELP,
  normaliseCustomStepKey,
} from '@/domain/contacts/email-template-steps';
import {
  deleteContactEmailTemplateAction,
  upsertContactEmailTemplateAction,
} from '@/server/actions/contacts/contact-email';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

export function ContactEmailTemplatesSettings({
  initialTemplates,
  initialSelectedTemplateId,
}: {
  initialTemplates: ContactEmailTemplateView[];
  initialSelectedTemplateId?: string | undefined;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const defaultSelectedId =
    initialSelectedTemplateId &&
    initialTemplates.some((template) => template.id === initialSelectedTemplateId)
      ? initialSelectedTemplateId
      : (initialTemplates[0]?.id ?? '');
  const [selectedId, setSelectedId] = useState(defaultSelectedId);
  const selected = templates.find((t) => t.id === selectedId) ?? templates[0] ?? null;

  const [name, setName] = useState(selected?.name ?? '');
  const [stepKey, setStepKey] = useState(selected?.stepKey ?? '');
  const [subject, setSubject] = useState(selected?.subject ?? '');
  const [bodyHtml, setBodyHtml] = useState(selected?.bodyHtml ?? '');
  const [pending, setPending] = useState(false);

  const selectTemplate = (template: ContactEmailTemplateView) => {
    setSelectedId(template.id);
    setName(template.name);
    setStepKey(template.stepKey);
    setSubject(template.subject);
    setBodyHtml(template.bodyHtml);
  };

  const save = async () => {
    if (!selected) return;
    setPending(true);
    try {
      const result = await upsertContactEmailTemplateAction({
        templateId: selected.id,
        stepKey,
        name: name.trim(),
        subject: subject.trim(),
        bodyHtml: bodyHtml.trim(),
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Template saved');
      setTemplates((prev) =>
        prev.map((t) => (t.id === result.data.template.id ? result.data.template : t)),
      );
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const createNew = async () => {
    const label = window.prompt('Name for the new template step', 'Custom outreach');
    if (!label?.trim()) return;
    const key = normaliseCustomStepKey(label);
    setPending(true);
    try {
      const result = await upsertContactEmailTemplateAction({
        stepKey: key,
        name: label.trim(),
        subject: 'Message from {{org_name}}',
        bodyHtml: `<p>Hi {{first_name}},</p>\n<p>Your message here.</p>\n<p>Best,<br>{{sender_name}}</p>`,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      const next = result.data.template;
      setTemplates((prev) => [...prev, next].sort((a, b) => a.sortOrder - b.sortOrder));
      selectTemplate(next);
      toast.success('Template created');
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    if (!window.confirm(`Delete template “${selected.name}”?`)) return;
    setPending(true);
    try {
      const result = await deleteContactEmailTemplateAction({ templateId: selected.id });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      const remaining = templates.filter((t) => t.id !== selected.id);
      setTemplates(remaining);
      if (remaining[0]) selectTemplate(remaining[0]);
      toast.success('Template deleted');
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="rounded-xl2 border border-line/60 bg-white p-3 shadow-panel">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-[13px] font-extrabold text-ink-900">Steps</h2>
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => void createNew()}>
            Add
          </Button>
        </div>
        <ul className="max-h-[420px] space-y-0.5 overflow-y-auto">
          {templates.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className={`w-full rounded-lg px-2 py-2 text-left text-[12px] font-semibold ${
                  t.id === selectedId ? 'bg-brand-50 text-brand-800' : 'text-ink-700 hover:bg-soft'
                }`}
                onClick={() => selectTemplate(t)}
              >
                <span className="block truncate">{t.stepLabel}</span>
                <span className="block truncate text-[11px] font-medium text-ink-400">{t.name}</span>
              </button>
            </li>
          ))}
        </ul>
        <Link
          href="/settings"
          className="mt-3 block px-2 text-[12px] font-bold text-brand-700 hover:text-brand-800"
        >
          ← Settings
        </Link>
      </aside>

      {selected ? (
        <section className="space-y-4 rounded-xl2 border border-line/60 bg-white p-5 shadow-panel">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex-1 text-[15px] font-extrabold text-ink-900">Edit template</h2>
            {selected.isSystem ? (
              <span className="rounded-full bg-soft px-2 py-0.5 text-[11px] font-bold text-ink-500">
                Default
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-rose-700"
              disabled={pending}
              onClick={() => void remove()}
            >
              Delete
            </Button>
          </div>

          <label className="block space-y-1">
            <span className="text-[12px] font-bold text-ink-500">Display name</span>
            <input
              className="h-10 w-full rounded-xl border border-line px-3 text-[13px]"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[12px] font-bold text-ink-500">Step key</span>
            <input
              className="h-10 w-full rounded-xl border border-line px-3 font-mono text-[12px]"
              value={stepKey}
              onChange={(event) => setStepKey(normaliseCustomStepKey(event.target.value))}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[12px] font-bold text-ink-500">Subject</span>
            <input
              className="h-10 w-full rounded-xl border border-line px-3 text-[13px]"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[12px] font-bold text-ink-500">Body (HTML)</span>
            <textarea
              className="min-h-[200px] w-full rounded-xl border border-line px-3 py-2 font-mono text-[12px]"
              value={bodyHtml}
              onChange={(event) => setBodyHtml(event.target.value)}
            />
          </label>

          <p className="text-[12px] text-ink-500">
            Tokens:{' '}
            {EMAIL_MERGE_TOKEN_HELP.map((t) => t.token).join(', ')}
          </p>

          <Button type="button" disabled={pending} onClick={() => void save()}>
            {pending ? 'Saving…' : 'Save template'}
          </Button>
        </section>
      ) : (
        <p className="text-[13px] text-ink-500">No templates yet.</p>
      )}
    </div>
  );
}
