'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Mail, MessageSquare, Phone } from 'lucide-react';
import { AddContactDialog } from '@/features/contacts/components/add-contact-dialog';
import type { PipelineListItem } from '@/domain/opportunities/card-view';
import {
  OPPORTUNITY_PRIORITY_OPTIONS,
  OPPORTUNITY_SOURCE_OPTIONS,
  OPPORTUNITY_VALUE_TYPE_OPTIONS,
} from '@/domain/opportunities/form-constants';
import { createOpportunityAction } from '@/server/actions/opportunities/create-opportunity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { applyAffected } from '@/lib/entities/invalidate';
import { cn } from '@/lib/utils';

const LAST_PIPELINE_KEY = 'crm:lastPipelineId';

type Tag = { id: string; name: string };
type Member = { id: string; fullName: string };
type Stage = { id: string; name: string; kind: string; probability: number | null };

type ContactPick = {
  id: string;
  label: string;
  canContact?: { email: boolean; sms: boolean; whatsapp: boolean; call: boolean };
};

function defaultNextTaskDueLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}

function toIsoFromLocalDatetime(local: string): string | undefined {
  if (!local.trim()) return undefined;
  const parsed = new Date(local);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export function AddOpportunityForm({
  pipelines,
  initialPipelineId,
  initialStageId,
  currentUserId,
  role,
  defaultContactId = null,
  contactOptions,
  onCreated,
  onCancel,
  initialCompanyId = null,
}: {
  pipelines: PipelineListItem[];
  initialPipelineId: string;
  initialStageId: string;
  currentUserId: string;
  role: string;
  defaultContactId?: string | null;
  contactOptions: { id: string; label: string }[];
  onCreated: (opportunityId: string) => void;
  onCancel: () => void;
  initialCompanyId?: string | null;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pipelineId, setPipelineId] = useState(initialPipelineId);
  const [stageId, setStageId] = useState(initialStageId);
  const [stages, setStages] = useState<Stage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [pipelineName, setPipelineName] = useState('');

  const [contactQuery, setContactQuery] = useState('');
  const [contactId, setContactId] = useState(defaultContactId ?? contactOptions[0]?.id ?? '');
  const [contactMatches, setContactMatches] = useState<ContactPick[]>([]);
  const [contactPick, setContactPick] = useState<ContactPick | null>(null);

  const [companyQuery, setCompanyQuery] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(initialCompanyId);
  const [companyMatches, setCompanyMatches] = useState<
    { id: string; name: string; domain: string | null }[]
  >([]);

  const [name, setName] = useState('');
  const [valueGbp, setValueGbp] = useState('');
  const [ownerId, setOwnerId] = useState(currentUserId);
  const [expectedClose, setExpectedClose] = useState('');
  const [nextTaskTitle, setNextTaskTitle] = useState('');
  const [nextTaskDue, setNextTaskDue] = useState(defaultNextTaskDueLocal());
  const [nextTaskAssigneeId, setNextTaskAssigneeId] = useState(currentUserId);

  const [valueType, setValueType] = useState('one_off');
  const [probabilityOverride, setProbabilityOverride] = useState('');
  const [source, setSource] = useState('Manual');
  const [campaign, setCampaign] = useState('');
  const [priority, setPriority] = useState('normal');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStage = useMemo(
    () => stages.find((s) => s.id === stageId) ?? null,
    [stages, stageId],
  );

  const loadPipelineMeta = useCallback(async (pid: string) => {
    const response = await fetch(`/api/v1/pipelines/${pid}/create-meta`);
    if (!response.ok) return;
    const data = (await response.json()) as {
      pipelineName: string;
      stages: Stage[];
      members: Member[];
    };
    setPipelineName(data.pipelineName);
    setStages(data.stages);
    setMembers(data.members);
    if (data.members.some((m) => m.id === currentUserId)) {
      setOwnerId(currentUserId);
      setNextTaskAssigneeId(currentUserId);
    } else if (data.members[0]) {
      setOwnerId(data.members[0].id);
      setNextTaskAssigneeId(data.members[0].id);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!pipelineId) return;
    void loadPipelineMeta(pipelineId);
    try {
      window.localStorage.setItem(LAST_PIPELINE_KEY, pipelineId);
    } catch {
      /* ignore */
    }
  }, [pipelineId, loadPipelineMeta]);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(LAST_PIPELINE_KEY) : null;
    if (stored && pipelines.some((p) => p.id === stored)) {
      setPipelineId(stored);
    }
  }, [pipelines]);

  useEffect(() => {
    if (initialStageId) setStageId(initialStageId);
    else if (stages.length > 0) {
      const firstOpen = stages.find((s) => s.kind === 'open') ?? stages[0];
      if (firstOpen) setStageId(firstOpen.id);
    }
  }, [initialStageId, stages]);

  useEffect(() => {
    void fetch('/api/v1/tags')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: Tag[] }) => setTags(d.items ?? []));
  }, []);

  useEffect(() => {
    if (!contactQuery.trim()) {
      setContactMatches([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/v1/contacts/search?q=${encodeURIComponent(contactQuery.trim())}`)
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then(
          (data: {
            items: { id: string; displayName: string; email: string | null }[];
          }) =>
            setContactMatches(
              data.items.map((row) => ({ id: row.id, label: row.displayName })),
            ),
        );
    }, 200);
    return () => window.clearTimeout(timer);
  }, [contactQuery]);

  useEffect(() => {
    if (!contactId) return;
    void fetch(`/api/v1/contacts/${contactId}/deal-prefill`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          data: {
            displayName: string;
            companyId: string | null;
            companyName: string | null;
            source: string | null;
            campaign: string | null;
            canContact: ContactPick['canContact'];
          } | null,
        ) => {
          if (!data) return;
          setContactPick({
            id: contactId,
            label: data.displayName,
            ...(data.canContact ? { canContact: data.canContact } : {}),
          });
          setContactQuery(data.displayName);
          if (data.companyId) {
            setCompanyId(data.companyId);
            setCompanyQuery(data.companyName ?? '');
          }
          if (data.source) {
            const match = OPPORTUNITY_SOURCE_OPTIONS.find(
              (opt) => opt.value.toLowerCase() === data.source!.toLowerCase(),
            );
            if (match) setSource(match.value);
          }
          if (data.campaign) setCampaign(data.campaign);
        },
      );
  }, [contactId]);

  useEffect(() => {
    if (name.trim()) return;
    const company = companyQuery.trim();
    const suffix = pipelineName.trim();
    if (company && suffix) setName(`${company} · ${suffix}`);
    else if (contactPick?.label && suffix) setName(`${contactPick.label} · ${suffix}`);
  }, [companyQuery, pipelineName, contactPick, name]);

  useEffect(() => {
    if (!companyQuery.trim()) {
      setCompanyMatches([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/v1/companies/search?q=${encodeURIComponent(companyQuery.trim())}`)
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((data: { items: { id: string; name: string; domain: string | null }[] }) =>
          setCompanyMatches(data.items),
        );
    }, 200);
    return () => window.clearTimeout(timer);
  }, [companyQuery]);

  const submit = async () => {
    setError(null);
    if (!contactId) {
      toast.error('Select a contact');
      return;
    }
    setPending(true);
    try {
      const probRaw =
        probabilityOverride.trim() === ''
          ? undefined
          : Number.parseInt(probabilityOverride, 10);
      const prob =
        probRaw !== undefined &&
        probRaw !== selectedStage?.probability &&
        Number.isFinite(probRaw)
          ? probRaw
          : undefined;
      const result = await createOpportunityAction({
        contactId,
        companyId: companyId ?? undefined,
        pipelineId,
        stageId,
        name: name.trim(),
        valueGbp,
        ownerId,
        expectedCloseDate: expectedClose || undefined,
        valueType: valueType as 'one_off' | 'recurring_monthly' | 'recurring_annual',
        priority: priority as 'low' | 'normal' | 'high',
        source: source as (typeof OPPORTUNITY_SOURCE_OPTIONS)[number]['value'],
        campaign,
        probabilityOverride: prob,
        tagIds,
        followerIds,
        description,
        nextTaskTitle,
        nextTaskDueAt: toIsoFromLocalDatetime(nextTaskDue),
        nextTaskAssigneeId: nextTaskTitle.trim() ? nextTaskAssigneeId : undefined,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      if (result.affected?.length) {
        applyAffected(queryClient, result.affected);
      }
      toast.success('Opportunity created', {
        action: {
          label: 'Open deal',
          onClick: () => router.push(`/opportunities?deal=${result.data.id}`),
        },
      });
      onCreated(result.data.id);
    } finally {
      setPending(false);
    }
  };

  const toggleTag = (id: string) => {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const toggleFollower = (id: string) => {
    setFollowerIds((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-ink-500">Deal</h3>
        <Field label="Opportunity name">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Contact">
          <div className="flex gap-2">
            <Input
              className="flex-1"
              value={contactQuery}
              onChange={(e) => {
                setContactQuery(e.target.value);
                setContactId('');
              }}
              placeholder="Search contacts"
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => setAddContactOpen(true)}>
              Create contact
            </Button>
          </div>
          {contactPick?.canContact ? (
            <span className="mt-1 flex gap-1">
              <ChannelIcon ok={contactPick.canContact.email} icon={Mail} label="Email" />
              <ChannelIcon ok={contactPick.canContact.sms} icon={MessageSquare} label="SMS" />
              <ChannelIcon ok={contactPick.canContact.whatsapp} icon={MessageSquare} label="WhatsApp" />
              <ChannelIcon ok={contactPick.canContact.call} icon={Phone} label="Calls" />
            </span>
          ) : null}
          {contactMatches.length > 0 && !contactId ? (
            <ul className="mt-1 max-h-28 overflow-y-auto rounded-lg border border-line bg-white">
              {contactMatches.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-[12px] hover:bg-soft"
                    onClick={() => {
                      setContactId(row.id);
                      setContactQuery(row.label);
                    }}
                  >
                    {row.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Field>
        <Field label="Company">
          <Input
            value={companyQuery}
            onChange={(e) => {
              setCompanyQuery(e.target.value);
              setCompanyId(null);
            }}
            placeholder="Optional — from contact by default"
          />
          {companyMatches.length > 0 && !companyId ? (
            <ul className="mt-1 max-h-24 overflow-y-auto rounded-lg border border-line bg-white">
              {companyMatches.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-[12px] hover:bg-soft"
                    onClick={() => {
                      setCompanyId(row.id);
                      setCompanyQuery(row.name);
                    }}
                  >
                    {row.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Pipeline">
            <Select value={pipelineId} onChange={(e) => setPipelineId(e.target.value)}>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Stage">
            <Select value={stageId} onChange={(e) => setStageId(e.target.value)}>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Value (GBP)">
            <Input
              value={valueGbp}
              onChange={(e) => setValueGbp(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
            />
          </Field>
          <Field label="Expected close">
            <Input type="date" value={expectedClose} onChange={(e) => setExpectedClose(e.target.value)} />
          </Field>
        </div>
        <Field label="Owner">
          <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </Select>
          {members.length === 0 ? (
            <p className="text-[12px] text-amber-800">No users are assigned to this pipeline yet.</p>
          ) : null}
        </Field>
      </section>

      <section className="space-y-3 rounded-xl border border-line/70 bg-soft/30 p-4">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-ink-500">Next step</h3>
        <Field label="Next task">
          <Input
            value={nextTaskTitle}
            onChange={(e) => setNextTaskTitle(e.target.value)}
            placeholder="e.g. Send proposal"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Due">
            <Input
              type="datetime-local"
              value={nextTaskDue}
              onChange={(e) => setNextTaskDue(e.target.value)}
            />
          </Field>
          <Field label="Assigned to">
            <Select value={nextTaskAssigneeId} onChange={(e) => setNextTaskAssigneeId(e.target.value)}>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      <CollapsibleSection title="More details" open={moreOpen} onToggle={() => setMoreOpen((v) => !v)}>
        <Field label="Value type">
          <Select value={valueType} onChange={(e) => setValueType(e.target.value)}>
            {OPPORTUNITY_VALUE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={`Probability${selectedStage?.probability != null ? ` (stage default ${selectedStage.probability}%)` : ''}`}
        >
          <Input
            value={probabilityOverride}
            onChange={(e) => setProbabilityOverride(e.target.value.replace(/\D/g, '').slice(0, 3))}
            placeholder={
              selectedStage?.probability != null ? String(selectedStage.probability) : 'Override %'
            }
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Source">
            <Select value={source} onChange={(e) => setSource(e.target.value)}>
              {OPPORTUNITY_SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Campaign">
            <Input value={campaign} onChange={(e) => setCampaign(e.target.value)} />
          </Field>
        </div>
        <Field label="Priority">
          <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            {OPPORTUNITY_PRIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
        {tags.length > 0 ? (
          <Field label="Tags">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-[12px] font-semibold',
                    tagIds.includes(tag.id)
                      ? 'border-brand-400 bg-brand-50 text-brand-800'
                      : 'border-line bg-white text-ink-600',
                  )}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </Field>
        ) : null}
        {members.length > 0 ? (
          <Field label="Followers">
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={cn(
                    'rounded-lg border px-2.5 py-1 text-[12px] font-semibold',
                    followerIds.includes(m.id)
                      ? 'border-brand-400 bg-brand-50 text-brand-800'
                      : 'border-line bg-white text-ink-600',
                  )}
                  onClick={() => toggleFollower(m.id)}
                >
                  {m.fullName}
                </button>
              ))}
            </div>
          </Field>
        ) : null}
        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Saved as the first note on the deal"
          />
        </Field>
        <p className="text-[12px] text-ink-500">
          Custom opportunity fields can be filled after save when configured for this pipeline.
        </p>
      </CollapsibleSection>

      {error ? (
        <p className="text-[13px] font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={pending || members.length === 0} onClick={() => void submit()}>
          {pending ? 'Creating…' : 'Create opportunity'}
        </Button>
      </div>

      <AddContactDialog
        open={addContactOpen}
        onOpenChange={setAddContactOpen}
        role={role}
        userId={currentUserId}
        onCreated={(id) => {
          setContactId(id);
          setAddContactOpen(false);
        }}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <Label className="text-[12px] font-semibold text-ink-500">{label}</Label>
      {children}
    </label>
  );
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line/70">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-bold text-ink-900"
        onClick={onToggle}
      >
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        {title}
      </button>
      {open ? <div className="space-y-3 border-t border-line/60 px-4 py-4">{children}</div> : null}
    </section>
  );
}

function ChannelIcon({
  ok,
  icon: Icon,
  label,
}: {
  ok: boolean;
  icon: typeof Mail;
  label: string;
}) {
  return (
    <span
      title={`${label}: ${ok ? 'Allowed' : 'Blocked'}`}
      className={cn(
        'grid size-6 place-items-center rounded-md',
        ok ? 'bg-soft text-ink-600' : 'bg-rose-50 text-rose-700',
      )}
    >
      <Icon className="size-3.5" />
    </span>
  );
}
