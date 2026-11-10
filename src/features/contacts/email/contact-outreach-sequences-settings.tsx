'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ContactEmailTemplateView } from '@/domain/contacts/email-template-view';
import type { OrgOutreachSequenceSteps } from '@/domain/contacts/outreach-sequence-schemas';
import type { OrgOutreachSequenceView } from '@/domain/contacts/outreach-sequence-view';
import { OutreachStepEmailTemplateField } from '@/features/contacts/email/outreach-step-email-template-field';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { defaultStepKeyForSequence } from '@/domain/contacts/outreach-sequence-keys';
import { CreateOutreachSequenceDialog } from '@/features/contacts/email/create-outreach-sequence-dialog';
import {
  deleteOrgOutreachSequenceAction,
  upsertOrgOutreachSequenceAction,
} from '@/server/actions/contacts/org-outreach-sequence';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';

export function ContactOutreachSequencesSettings({
  initialItems,
  initialTemplates,
}: {
  initialItems: OrgOutreachSequenceView[];
  initialTemplates: ContactEmailTemplateView[];
}) {
  const [items, setItems] = useState(initialItems);
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedKey, setSelectedKey] = useState(initialItems[0]?.sequenceKey ?? '');
  const selected = items.find((s) => s.sequenceKey === selectedKey) ?? items[0] ?? null;

  const [label, setLabel] = useState(selected?.label ?? '');
  const [steps, setSteps] = useState<OrgOutreachSequenceSteps>(selected?.steps ?? []);
  const [pending, setPending] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [stepDeleteIndex, setStepDeleteIndex] = useState<number | null>(null);

  const selectSequence = (item: OrgOutreachSequenceView) => {
    setSelectedKey(item.sequenceKey);
    setLabel(item.label);
    setSteps(item.steps.map((s) => ({ ...s })));
  };

  const updateStep = (index: number, patch: Partial<OrgOutreachSequenceSteps[number]>) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, ...patch } : step)),
    );
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    setSteps((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index]!;
      next[index] = next[target]!;
      next[target] = tmp;
      return next;
    });
  };

  const addStep = () => {
    if (!selected) return;
    setSteps((prev) => {
      const index = prev.length;
      return [
        ...prev,
        {
          stepKey: defaultStepKeyForSequence(selected.sequenceKey, index),
          label: 'New step',
          daysAfterPrevious: 3,
          reminderTitle: 'Send outreach email',
        },
      ];
    });
  };

  const confirmRemoveStep = () => {
    if (stepDeleteIndex === null || steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, i) => i !== stepDeleteIndex));
    setStepDeleteIndex(null);
    toast.message('Step removed — save sequence to apply');
  };

  const stepPendingDelete =
    stepDeleteIndex !== null ? (steps[stepDeleteIndex] ?? null) : null;

  const removeSequence = async () => {
    if (!selected?.isUserCreated) return;
    if (!window.confirm(`Delete sequence “${selected.label}”? This cannot be undone.`)) return;
    setPending(true);
    try {
      const result = await deleteOrgOutreachSequenceAction({
        sequenceKey: selected.sequenceKey,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      const remaining = items.filter((i) => i.sequenceKey !== selected.sequenceKey);
      setItems(remaining);
      if (remaining[0]) selectSequence(remaining[0]!);
      toast.message('Sequence deleted');
    } finally {
      setPending(false);
    }
  };

  const save = async () => {
    if (!selected) return;
    setPending(true);
    try {
      const result = await upsertOrgOutreachSequenceAction({
        sequenceKey: selected.sequenceKey,
        label: label.trim(),
        steps,
      });
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Sequence saved');
      setItems((prev) =>
        prev.map((item) =>
          item.sequenceKey === result.data.sequence.sequenceKey
            ? result.data.sequence
            : item,
        ),
      );
    } finally {
      setPending(false);
    }
  };

  if (!selected) {
    return null;
  }

  return (
    <>
      <CreateOutreachSequenceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(sequence) => {
          setItems((prev) => [...prev, sequence]);
          selectSequence(sequence);
        }}
      />

      <Dialog
        open={stepDeleteIndex !== null}
        onOpenChange={(open) => {
          if (!open) setStepDeleteIndex(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove this step?</DialogTitle>
            <DialogDescription>
              {stepPendingDelete ? (
                <>
                  <span className="font-semibold text-ink-800">{stepPendingDelete.label}</span> will
                  be removed from the sequence. Save the sequence to keep this change.
                </>
              ) : (
                'This step will be removed from the sequence.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setStepDeleteIndex(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmRemoveStep}>
              Remove step
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <aside className="rounded-xl2 border border-line/60 bg-white p-3 shadow-panel">
        <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">
          Sequences
        </p>
        <Button
          type="button"
          className="mb-2 w-full"
          size="sm"
          disabled={pending}
          onClick={() => setCreateOpen(true)}
        >
          New sequence
        </Button>
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.sequenceKey}>
              <button
                type="button"
                onClick={() => selectSequence(item)}
                className={`w-full rounded-lg px-3 py-2 text-left text-[13px] font-semibold ${
                  item.sequenceKey === selectedKey
                    ? 'bg-brand-50 text-brand-800'
                    : 'text-ink-700 hover:bg-soft'
                }`}
              >
                {item.label}
                {item.isUserCreated ? (
                  <span className="ml-1 text-[10px] font-bold text-brand-700">Yours</span>
                ) : item.isCustomised ? (
                  <span className="ml-1 text-[10px] font-bold text-mint-700">Edited</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-4 px-2 text-[12px] font-medium text-ink-500">
          Each step uses an email template with the same{' '}
          <Link href="/settings/email-templates" className="font-bold text-brand-700">
            step key
          </Link>
          .
        </p>
      </aside>

      <section className="rounded-xl2 border border-line/60 bg-white p-5 shadow-panel">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <label className="text-[12px] font-bold text-ink-500">Sequence name</label>
            <input
              className="mt-1 block w-full max-w-md rounded-lg border border-line px-3 py-2 text-[14px] font-semibold text-ink-900"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {selected.isUserCreated ? (
              <Button type="button" variant="ghost" disabled={pending} onClick={() => void removeSequence()}>
                Delete
              </Button>
            ) : null}
            <Button type="button" onClick={() => void save()} disabled={pending}>
              Save sequence
            </Button>
          </div>
        </div>

        <ol className="mt-6 space-y-4">
          {steps.map((step, index) => (
            <li
              key={`${step.stepKey}-${index}`}
              className="rounded-xl border border-line/70 bg-soft/40 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-bold text-ink-900">
                  Step {index + 1}
                  {index === 0 ? (
                    <span className="ml-2 text-[11px] font-semibold text-ink-500">
                      (starts on schedule)
                    </span>
                  ) : null}
                </p>
                <div className="flex gap-0.5">
                  <Button
                    type="button"
                    variant="icon"
                    size="icon"
                    aria-label="Move step up"
                    disabled={index === 0}
                    className="text-ink-500"
                    onClick={() => moveStep(index, -1)}
                  >
                    <ChevronUp className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="icon"
                    size="icon"
                    aria-label="Move step down"
                    disabled={index === steps.length - 1}
                    className="text-ink-500"
                    onClick={() => moveStep(index, 1)}
                  >
                    <ChevronDown className="size-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="icon"
                    size="icon"
                    aria-label="Remove step"
                    disabled={steps.length <= 1}
                    className={cn(
                      'text-ink-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700',
                    )}
                    onClick={() => setStepDeleteIndex(index)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-[12px] font-bold text-ink-500">
                  Label
                  <input
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-[13px] font-medium"
                    value={step.label}
                    onChange={(e) => updateStep(index, { label: e.target.value })}
                  />
                </label>
                <label className="block text-[12px] font-bold text-ink-500">
                  Days after previous send
                  <input
                    type="number"
                    min={0}
                    max={365}
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-[13px]"
                    value={step.daysAfterPrevious}
                    onChange={(e) =>
                      updateStep(index, {
                        daysAfterPrevious: Number.parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </label>
                <label className="block text-[12px] font-bold text-ink-500">
                  Reminder task title
                  <input
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-[13px]"
                    value={step.reminderTitle}
                    onChange={(e) => updateStep(index, { reminderTitle: e.target.value })}
                  />
                </label>
              </div>

              <OutreachStepEmailTemplateField
                stepKey={step.stepKey}
                stepLabel={step.label}
                templates={templates}
                onStepKeyChange={(nextKey) => updateStep(index, { stepKey: nextKey })}
                onTemplateCreated={(created) => {
                  setTemplates((prev) => {
                    const without = prev.filter((template) => template.id !== created.id);
                    return [...without, created].sort((a, b) => a.sortOrder - b.sortOrder);
                  });
                }}
              />
            </li>
          ))}
        </ol>

        <Button type="button" variant="ghost" className="mt-4" onClick={addStep}>
          Add step
        </Button>
      </section>
    </div>
    </>
  );
}
