'use client';

import Link from 'next/link';
import { Check, ChevronDown, ExternalLink, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DashboardWelcomeChecklistItem } from '@/domain/dashboard/types';
import type { WelcomeChecklistId } from '@/domain/dashboard/welcome-checklist';
import { SetupPanelShell } from '@/features/getting-started/components/setup-panel-shell';
import { stepMeta } from '@/features/getting-started/welcome-step-meta';
import { WelcomeSetupPanel } from '@/features/dashboard/welcome/welcome-setup-panels';
import { cn } from '@/lib/utils';
import type { CrmRole } from '@/server/db/schema';

function ExpandSection({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
      )}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export function WelcomeChecklist({
  items,
  role,
  onStepComplete,
  expandedId: controlledExpanded,
  onExpandedChange,
}: {
  items: DashboardWelcomeChecklistItem[];
  role: CrmRole;
  onStepComplete: () => void;
  expandedId?: string | null;
  onExpandedChange?: (id: string | null) => void;
}) {
  const firstOpen = items.find((item) => !item.done && item.inlineSetup)?.id ?? null;
  const [internalExpanded, setInternalExpanded] = useState<string | null>(firstOpen);

  const expandedId = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const setExpandedId = onExpandedChange ?? setInternalExpanded;

  useEffect(() => {
    if (expandedId === null && firstOpen) {
      setExpandedId(firstOpen);
    }
  }, [firstOpen, expandedId, setExpandedId]);

  function toggle(id: string, item: DashboardWelcomeChecklistItem) {
    if (item.done) return;
    if (!item.inlineSetup) return;
    setExpandedId(expandedId === id ? null : id);
  }

  function handleComplete(id: string) {
    onStepComplete();
    const next = items.find((item) => !item.done && item.inlineSetup && item.id !== id);
    setExpandedId(next?.id ?? null);
  }

  return (
    <ol className="relative space-y-0" role="list">
      <div
        className="absolute top-5 bottom-5 left-[35px] w-0.5 rounded-full bg-gradient-to-b from-brand-300/80 via-line/80 to-transparent"
        aria-hidden
      />

      {items.map((item, index) => {
        const expanded = expandedId === item.id;
        const stepId = item.id as WelcomeChecklistId;
        const meta = stepMeta(item.id);
        const Icon = meta.icon;
        const isLast = index === items.length - 1;

        return (
          <li
            key={item.id}
            id={`setup-step-${item.id}`}
            className={cn('relative scroll-mt-28 pb-5', isLast && 'pb-0')}
          >
            <div
              className={cn(
                'overflow-hidden rounded-xl2 border bg-white shadow-panel transition-shadow duration-200',
                expanded && !item.done && 'border-brand-200 ring-2 ring-brand-100/90 shadow-float',
                item.done && 'border-mint-100/80',
                !expanded && !item.done && 'border-line/60 hover:border-line',
              )}
            >
              {item.done ? (
                <Link
                  href={item.href}
                  className="group flex items-start gap-5 px-5 py-5 transition-colors hover:bg-mint-50/40 sm:px-6"
                >
                  <StepBadge done index={index} />
                  <StepCopy item={item} meta={meta} Icon={Icon} done />
                  <ExternalLink
                    className="mt-1 size-4 shrink-0 text-ink-300 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                </Link>
              ) : item.inlineSetup ? (
                <button
                  type="button"
                  className="flex w-full items-start gap-5 px-5 py-5 text-left transition-colors hover:bg-soft/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-500 sm:px-6"
                  aria-expanded={expanded}
                  onClick={() => toggle(item.id, item)}
                >
                  <StepBadge done={false} index={index} active={expanded} />
                  <StepCopy item={item} meta={meta} Icon={Icon} done={false} />
                  <ChevronDown
                    className={cn(
                      'mt-1 size-5 shrink-0 text-ink-400 transition-transform duration-300',
                      expanded && 'rotate-180 text-brand-600',
                    )}
                    aria-hidden
                  />
                </button>
              ) : (
                <div className="flex items-start gap-5 px-5 py-5 sm:px-6">
                  <StepBadge done={false} index={index} />
                  <StepCopy item={item} meta={meta} Icon={Icon} done={false} />
                </div>
              )}

              <ExpandSection open={Boolean(expanded && !item.done && item.inlineSetup)}>
                <SetupPanelShell>
                  <WelcomeSetupPanel
                    stepId={stepId}
                    role={role}
                    onComplete={() => handleComplete(item.id)}
                  />
                </SetupPanelShell>
              </ExpandSection>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StepBadge({
  done,
  index,
  active,
}: {
  done: boolean;
  index: number;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        'relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-extrabold transition-colors',
        done && 'border-mint-200 bg-mint-50 text-mint-700',
        !done &&
          active &&
          'border-brand-500 bg-brand-600 text-white ring-4 ring-brand-200/50',
        !done && !active && 'border-line bg-white text-ink-500',
      )}
    >
      {done ? <Check className="size-4" strokeWidth={2.5} aria-hidden /> : index + 1}
    </span>
  );
}

function StepCopy({
  item,
  meta,
  Icon,
  done,
}: {
  item: DashboardWelcomeChecklistItem;
  meta: ReturnType<typeof stepMeta>;
  Icon: LucideIcon;
  done: boolean;
}) {
  return (
    <span className="min-w-0 flex-1 text-left">
      <span className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'text-[14px] font-extrabold tracking-tight',
            done ? 'text-ink-500 line-through decoration-ink-300/60' : 'text-ink-900',
          )}
        >
          {item.label}
        </span>
        {!done ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">
            <Icon className="size-3" strokeWidth={2} aria-hidden />
            {meta.shortLabel}
          </span>
        ) : (
          <span className="rounded-full bg-mint-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mint-700">
            Done
          </span>
        )}
      </span>
      {item.description ? (
        <span className="mt-1.5 block text-[12.5px] font-medium leading-relaxed text-ink-500">
          {item.description}
        </span>
      ) : null}
    </span>
  );
}
