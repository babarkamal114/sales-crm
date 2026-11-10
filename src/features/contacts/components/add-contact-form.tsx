'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { PipelineListItem } from '@/domain/opportunities/card-view';
import { createContactAction } from '@/server/actions/contacts/create-contact';
import { useCreateDialog } from '@/components/create-dialog';
import { applyAffected } from '@/lib/entities/invalidate';
import { useQueryClient } from '@tanstack/react-query';
import type { ConsentChannel, MarketingConsentState } from '@/domain/contacts/consent';
import {
  CONSENT_CHANNEL_LABELS,
  CONSENT_SOURCE_OPTIONS,
  CONTACT_LEAD_SOURCE_OPTIONS,
  CONTACT_LIFECYCLE_OPTIONS,
  CONTACT_RECIPIENT_OPTIONS,
  MARKETING_CONSENT_LABELS,
} from '@/domain/contacts/form-constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';

type Member = { id: string; fullName: string };
type Tag = { id: string; name: string; colourKey: string };

type ChannelDraft = {
  marketingConsent: MarketingConsentState;
  dnd: boolean;
  dndReason: string;
};

const CHANNELS: ConsentChannel[] = ['email', 'sms', 'whatsapp', 'call'];
const LAST_PIPELINE_KEY = 'crm:lastPipelineId';

type DealStage = { id: string; name: string; kind: string };

const emptyChannels = (): Record<ConsentChannel, ChannelDraft> => ({
  email: { marketingConsent: 'unknown', dnd: false, dndReason: '' },
  sms: { marketingConsent: 'unknown', dnd: false, dndReason: '' },
  whatsapp: { marketingConsent: 'unknown', dnd: false, dndReason: '' },
  call: { marketingConsent: 'unknown', dnd: false, dndReason: '' },
});

export function AddContactForm({
  role,
  userId,
  defaultCompanyId = null,
  defaultCompanyName = null,
  onCreated,
  onCancel,
}: {
  role: string;
  userId: string;
  defaultCompanyId?: string | null;
  defaultCompanyName?: string | null;
  onCreated: (contactId: string) => void;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { openCreate } = useCreateDialog();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [lifecycle, setLifecycle] = useState('lead');
  const [ownerId, setOwnerId] = useState(userId);
  const [companyQuery, setCompanyQuery] = useState('');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyMatches, setCompanyMatches] = useState<
    { id: string; name: string; domain: string | null }[]
  >([]);
  const [suggestCreate, setSuggestCreate] = useState<{ name: string; domain: string } | null>(null);
  const [channels, setChannels] = useState(emptyChannels);
  const [consentSource, setConsentSource] = useState('');
  const [consentWording, setConsentWording] = useState('');
  const [secondaryEmail, setSecondaryEmail] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [source, setSource] = useState('Manual');
  const [campaign, setCampaign] = useState('');
  const [recipientType, setRecipientType] = useState('individual');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [country, setCountry] = useState('GB');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [dealSectionOpen, setDealSectionOpen] = useState(false);
  const [createDeal, setCreateDeal] = useState(false);
  const [pipelines, setPipelines] = useState<PipelineListItem[]>([]);
  const [pipelineId, setPipelineId] = useState('');
  const [stageId, setStageId] = useState('');
  const [dealStages, setDealStages] = useState<DealStage[]>([]);
  const [dealName, setDealName] = useState('');
  const [dealValueGbp, setDealValueGbp] = useState('');
  const [dealCloseDate, setDealCloseDate] = useState('');
  const [pending, setPending] = useState(false);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState<{ id: string; displayName: string } | null>(null);
  const [phoneHint, setPhoneHint] = useState<{ id: string; displayName: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [collectDateOfBirth, setCollectDateOfBirth] = useState(false);

  const companyLocked = Boolean(defaultCompanyId);
  const canPickOwner = role === 'admin' || role === 'manager';

  const anyConsentGranted = useMemo(
    () => CHANNELS.some((ch) => channels[ch].marketingConsent === 'granted'),
    [channels],
  );

  useEffect(() => {
    if (defaultCompanyId) {
      setCompanyId(defaultCompanyId);
      setCompanyQuery(defaultCompanyName ?? '');
    }
    setOwnerId(userId);
  }, [defaultCompanyId, defaultCompanyName, userId]);

  useEffect(() => {
    void fetch('/api/v1/contacts/form-options')
      .then((r) => (r.ok ? r.json() : { collectDateOfBirth: false }))
      .then((d: { collectContactDateOfBirth: boolean }) =>
        setCollectDateOfBirth(d.collectContactDateOfBirth),
      );
    void fetch('/api/v1/tags')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: Tag[] }) => setTags(d.items ?? []));
    if (canPickOwner) {
      void fetch('/api/v1/org/members')
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d: { items: Member[] }) => setMembers(d.items ?? []));
    }
  }, [canPickOwner]);

  useEffect(() => {
    void fetch('/api/v1/pipelines')
      .then((r) => (r.ok ? r.json() : { pipelines: [] }))
      .then((data: { pipelines: PipelineListItem[] }) => {
        const list = data.pipelines ?? [];
        setPipelines(list);
        const stored =
          typeof window !== 'undefined' ? window.localStorage.getItem(LAST_PIPELINE_KEY) : null;
        const initial =
          (stored && list.some((p) => p.id === stored) ? stored : null) ??
          list.find((p) => p.isDefault)?.id ??
          list[0]?.id ??
          '';
        if (initial) setPipelineId(initial);
      });
  }, []);

  const loadDealPipelineMeta = useCallback(async (pid: string) => {
    const response = await fetch(`/api/v1/pipelines/${pid}/create-meta`);
    if (!response.ok) return;
    const data = (await response.json()) as { stages: DealStage[] };
    setDealStages(data.stages);
    const firstOpen = data.stages.find((s) => s.kind === 'open') ?? data.stages[0];
    if (firstOpen) setStageId(firstOpen.id);
  }, []);

  useEffect(() => {
    if (!pipelineId) return;
    void loadDealPipelineMeta(pipelineId);
    try {
      window.localStorage.setItem(LAST_PIPELINE_KEY, pipelineId);
    } catch {
      /* ignore */
    }
  }, [loadDealPipelineMeta, pipelineId]);

  const suggestedDealName = useMemo(() => {
    const companyLabel = companyQuery.trim() || suggestCreate?.name.trim() || '';
    const pipelineLabel = pipelines.find((p) => p.id === pipelineId)?.name ?? '';
    if (companyLabel && pipelineLabel) return `${companyLabel} · ${pipelineLabel}`;
    if (companyLabel) return companyLabel;
    const person = [firstName, lastName].filter(Boolean).join(' ').trim();
    if (person && pipelineLabel) return `${person} · ${pipelineLabel}`;
    return person || '';
  }, [companyQuery, firstName, lastName, pipelineId, pipelines, suggestCreate?.name]);

  useEffect(() => {
    if (!createDeal || dealName.trim()) return;
    if (suggestedDealName) setDealName(suggestedDealName);
  }, [createDeal, dealName, suggestedDealName]);

  useEffect(() => {
    if (!companyQuery.trim() || companyLocked) {
      setCompanyMatches([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/v1/companies/search?q=${encodeURIComponent(companyQuery.trim())}`)
        .then((response) => (response.ok ? response.json() : { items: [] }))
        .then((data: { items: { id: string; name: string; domain: string | null }[] }) =>
          setCompanyMatches(data.items),
        );
    }, 200);
    return () => window.clearTimeout(timer);
  }, [companyQuery, companyLocked]);

  useEffect(() => {
    if (companyLocked || !email.includes('@') || companyId) return;
    const timer = window.setTimeout(() => {
      void fetch(`/api/v1/companies/suggest?email=${encodeURIComponent(email.trim())}`)
        .then((r) => (r.ok ? r.json() : null))
        .then(
          (
            data: {
              company: { id: string; name: string; domain: string | null } | null;
              suggestCreate: { name: string; domain: string } | null;
            } | null,
          ) => {
            if (!data) return;
            if (data.company?.id) {
              setCompanyId(data.company.id);
              setCompanyQuery(data.company.name);
              setSuggestCreate(null);
              return;
            }
            setSuggestCreate(data.suggestCreate);
          },
        );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [email, companyId, companyLocked]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (email.trim()) params.set('email', email.trim());
      if (phone.trim()) params.set('phone', phone.trim());
      if (!params.toString()) {
        setEmailHint(null);
        setPhoneHint(null);
        return;
      }
      void fetch(`/api/v1/contacts/lookup?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then(
          (
            data: {
              emailMatch: { id: string; displayName: string } | null;
              phoneMatch: { id: string; displayName: string } | null;
            } | null,
          ) => {
            if (!data) return;
            setEmailHint(data.emailMatch);
            setPhoneHint(data.phoneMatch);
          },
        );
    }, 350);
    return () => window.clearTimeout(timer);
  }, [email, phone]);

  const toggleTag = (id: string) => {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const toggleFollower = (id: string) => {
    setFollowerIds((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const setChannel = (channel: ConsentChannel, patch: Partial<ChannelDraft>) => {
    setChannels((prev) => ({ ...prev, [channel]: { ...prev[channel], ...patch } }));
  };

  const submit = async (forceCreate = false) => {
    if (createDeal) {
      if (pipelines.length === 0) {
        toast.error('No pipeline available for the deal');
        return;
      }
      if (!pipelineId || !stageId) {
        toast.error('Choose a pipeline and stage for the deal');
        return;
      }
      const closeRaw = dealCloseDate.trim();
      if (closeRaw) {
        const close = new Date(closeRaw);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (close < today) {
          toast.error('Expected close date cannot be in the past');
          return;
        }
      }
    }

    setPending(true);
    setDuplicateId(null);
    try {
      const createName = companyQuery.trim() || suggestCreate?.name.trim() || '';
      const websiteForNew =
        suggestCreate?.domain ?? (email.includes('@') ? email.split('@')[1] : undefined);

      const result = await createContactAction({
        firstName,
        lastName,
        email: email.trim() || '',
        phone: phone.trim() || '',
        secondaryEmail: secondaryEmail.trim() || '',
        secondaryPhone: secondaryPhone.trim() || '',
        jobTitle: jobTitle.trim() || undefined,
        companyId: companyId ?? undefined,
        ...(!companyId && createName
          ? {
              newCompany: {
                name: createName,
                website: websiteForNew ?? '',
              },
            }
          : {}),
        ownerId,
        lifecycle: lifecycle as 'lead' | 'customer' | 'former_customer' | 'not_a_fit',
        source: source as (typeof CONTACT_LEAD_SOURCE_OPTIONS)[number]['value'],
        campaign: campaign.trim() || '',
        recipientType: recipientType as 'individual' | 'corporate',
        linkedinUrl: linkedinUrl.trim() || '',
        addressLine1: addressLine1.trim() || '',
        addressLine2: addressLine2.trim() || '',
        city: city.trim() || '',
        postcode: postcode.trim() || '',
        country,
        dateOfBirth: collectDateOfBirth ? dateOfBirth : '',
        tagIds,
        followerIds,
        note: note.trim() || '',
        consent: {
          channels: Object.fromEntries(
            CHANNELS.map((ch) => [
              ch,
              {
                marketingConsent: channels[ch].marketingConsent,
                dnd: channels[ch].dnd,
                dndReason: channels[ch].dndReason,
              },
            ]),
          ),
          source: (consentSource || undefined) as
            | (typeof CONSENT_SOURCE_OPTIONS)[number]['value']
            | undefined,
          wording: consentWording,
        },
        forceCreate: forceCreate || undefined,
        ...(createDeal && pipelineId && stageId
          ? {
              newOpportunity: {
                pipelineId,
                stageId,
                name: dealName.trim() || suggestedDealName || 'New deal',
                valueGbp: dealValueGbp,
                expectedCloseDate: dealCloseDate.trim(),
              },
            }
          : {}),
      });

      if (!result.ok) {
        if (result.error.code === 'CONFLICT' && 'data' in result && result.data?.contactId) {
          setDuplicateId(result.data.contactId as string);
          toast.message('A matching contact already exists');
          return;
        }
        toast.error(result.error.message);
        return;
      }

      if (result.affected?.length) {
        applyAffected(queryClient, result.affected);
      }
      const created = result.data;
      const opportunityId =
        'opportunityId' in created && created.opportunityId ? created.opportunityId : null;
      toast.success('Contact created', {
        ...(opportunityId
          ? {
              description: 'Contact, company and deal saved together.',
              action: {
                label: 'Open deal',
                onClick: () => router.push(`/opportunities?deal=${opportunityId}`),
              },
            }
          : 'companyId' in created && created.companyId && createName
            ? { description: 'Contact and company saved together.' }
            : {}),
      });
      if ('suppressionWarning' in result.data && result.data.suppressionWarning) {
        toast.warning('Suppressed person', {
          description:
            'This person was previously erased or objected. All channels were set to DND.',
        });
      }
      if ('id' in result.data) {
        onCreated(result.data.id);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-ink-500">Main</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="First name">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} />
          </Field>
          <Field label="Last name">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} />
          </Field>
        </div>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {emailHint ? (
            <HintDuplicate match={emailHint} onOpen={() => onCreated(emailHint.id)} />
          ) : null}
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="UK numbers OK" />
          {phoneHint ? (
            <HintDuplicate match={phoneHint} onOpen={() => onCreated(phoneHint.id)} />
          ) : null}
        </Field>
        {!companyLocked && suggestCreate && !companyId ? (
          <div className="rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-[12px] text-brand-900">
            No company for <strong>{suggestCreate.domain}</strong>.{' '}
            <button
              type="button"
              className="font-bold underline"
              onClick={() => {
                setCompanyQuery(suggestCreate.name);
                setSuggestCreate(null);
              }}
            >
              Create {suggestCreate.name}
            </button>
          </div>
        ) : null}
        <Field label="Company">
          <div className="flex gap-2">
            <Input
              className="flex-1"
              value={companyQuery}
              disabled={companyLocked}
              onChange={(e) => {
                setCompanyQuery(e.target.value);
                setCompanyId(null);
                setSuggestCreate(null);
              }}
              placeholder="Search or type a new company"
            />
            {!companyLocked ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                onClick={() =>
                  openCreate(
                    'company',
                    { ...(companyQuery.trim() ? { name: companyQuery.trim() } : {}) },
                    {
                      onCreated: (ref) => {
                        setCompanyId(ref.id);
                        void fetch(`/api/v1/companies/${ref.id}/quick`)
                          .then((r) => (r.ok ? r.json() : null))
                          .then((data: { company?: { displayName: string } } | null) => {
                            if (data?.company?.displayName) {
                              setCompanyQuery(data.company.displayName);
                            }
                          });
                      },
                    },
                  )
                }
              >
                New
              </Button>
            ) : null}
          </div>
          {companyMatches.length > 0 && !companyId && !companyLocked ? (
            <ul className="mt-1 max-h-28 overflow-y-auto rounded-lg border border-line bg-white">
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
                    {row.domain ? ` · ${row.domain}` : ''}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Field>
        <Field label="Job title">
          <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Owner">
            {canPickOwner ? (
              <Select value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </Select>
            ) : (
              <Input value="You" disabled className="bg-soft" />
            )}
          </Field>
          <Field label="Status">
            <Select value={lifecycle} onChange={(e) => setLifecycle(e.target.value)}>
              {CONTACT_LIFECYCLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-line/70 bg-soft/30 p-4">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-ink-500">Consent</h3>
        <p className="text-[12px] text-ink-500">
          Marketing consent is recorded per channel. One-to-one conversations are still allowed when
          consent is not given.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-[12px]">
            <thead>
              <tr className="text-ink-500">
                <th className="pb-2 font-semibold">Channel</th>
                <th className="pb-2 font-semibold">Marketing</th>
                <th className="pb-2 font-semibold">Do not contact</th>
              </tr>
            </thead>
            <tbody>
              {CHANNELS.map((ch) => (
                <tr key={ch} className="border-t border-line/60">
                  <td className="py-2 font-medium text-ink-800">{CONSENT_CHANNEL_LABELS[ch]}</td>
                  <td className="py-2 pr-2">
                    <Select
                      value={channels[ch].marketingConsent}
                      onChange={(e) =>
                        setChannel(ch, {
                          marketingConsent: e.target.value as MarketingConsentState,
                        })
                      }
                    >
                      {(['unknown', 'granted', 'denied'] as const).map((v) => (
                        <option key={v} value={v}>
                          {MARKETING_CONSENT_LABELS[v]}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="py-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={channels[ch].dnd}
                        onChange={(e) => setChannel(ch, { dnd: e.target.checked })}
                      />
                      DND
                    </label>
                    {channels[ch].dnd ? (
                      <Input
                        className="mt-1"
                        placeholder="Reason required"
                        value={channels[ch].dndReason}
                        onChange={(e) => setChannel(ch, { dndReason: e.target.value })}
                      />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {anyConsentGranted ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Consent source">
              <Select value={consentSource} onChange={(e) => setConsentSource(e.target.value)}>
                <option value="">Select…</option>
                {CONSENT_SOURCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Consent wording" className="sm:col-span-2">
              <Textarea
                value={consentWording}
                onChange={(e) => setConsentWording(e.target.value)}
                rows={2}
                placeholder="Exact wording the person agreed to"
              />
            </Field>
          </div>
        ) : null}
      </section>

      <CollapsibleSection
        title="Create opportunity"
        open={dealSectionOpen}
        onToggle={() => setDealSectionOpen((v) => !v)}
      >
        <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-ink-800">
          <input
            type="checkbox"
            className="size-4 rounded border-line"
            checked={createDeal}
            onChange={(e) => setCreateDeal(e.target.checked)}
          />
          Also create an open deal for this contact
        </label>
        {createDeal ? (
          pipelines.length === 0 ? (
            <p className="text-[13px] text-ink-500">
              No pipelines assigned. Ask an admin to add you to a pipeline.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Pipeline">
                  <Select
                    value={pipelineId}
                    onChange={(e) => setPipelineId(e.target.value)}
                  >
                    {pipelines.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Stage">
                  <Select value={stageId} onChange={(e) => setStageId(e.target.value)}>
                    {dealStages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Deal name">
                <Input
                  value={dealName}
                  onChange={(e) => setDealName(e.target.value)}
                  placeholder={suggestedDealName || 'Company · Pipeline'}
                  maxLength={200}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Value (£)">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={dealValueGbp}
                    onChange={(e) => setDealValueGbp(e.target.value)}
                    placeholder="0"
                  />
                </Field>
                <Field label="Expected close">
                  <Input
                    type="date"
                    value={dealCloseDate}
                    onChange={(e) => setDealCloseDate(e.target.value)}
                  />
                </Field>
              </div>
              <p className="text-[12px] text-ink-500">
                Saved in the same step as the contact (and new company, if you add one).
              </p>
            </div>
          )
        ) : null}
      </CollapsibleSection>

      <CollapsibleSection title="More details" open={moreOpen} onToggle={() => setMoreOpen((v) => !v)}>
        <Field label="Second email">
          <Input type="email" value={secondaryEmail} onChange={(e) => setSecondaryEmail(e.target.value)} />
        </Field>
        <Field label="Second phone">
          <Input value={secondaryPhone} onChange={(e) => setSecondaryPhone(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Lead source">
            <Select value={source} onChange={(e) => setSource(e.target.value)}>
              {CONTACT_LEAD_SOURCE_OPTIONS.map((opt) => (
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
        <Field label="Recipient type">
          <Select value={recipientType} onChange={(e) => setRecipientType(e.target.value)}>
            {CONTACT_RECIPIENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="LinkedIn profile">
          <Input
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/…"
          />
        </Field>
        <Field label="Address line 1">
          <Input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
        </Field>
        <Field label="Address line 2">
          <Input value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Town / city">
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <Field label="Postcode">
            <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} />
          </Field>
        </div>
        <Field label="Country">
          <Input value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={2} />
        </Field>
        {collectDateOfBirth ? (
          <Field label="Date of birth">
            <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </Field>
        ) : null}
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
        {canPickOwner && members.length > 0 ? (
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
        <Field label="Notes">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Saved as the first note on the contact"
          />
        </Field>
        <p className="text-[12px] text-ink-500">
          Custom fields can be filled in after save from the contact profile (Settings → custom
          fields).
        </p>
      </CollapsibleSection>

      {duplicateId ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-900">
          Duplicate found.{' '}
          <button type="button" className="font-bold underline" onClick={() => onCreated(duplicateId)}>
            Open it
          </button>
          {role === 'admin' || role === 'manager' ? (
            <>
              {' · '}
              <button type="button" className="font-bold underline" onClick={() => void submit(true)}>
                Create anyway
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={pending} onClick={() => void submit(false)}>
          {pending ? 'Saving…' : 'Save contact'}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1', className)}>
      <Label className="text-[12px] font-semibold text-ink-500">{label}</Label>
      {children}
    </label>
  );
}

function HintDuplicate({
  match,
  onOpen,
}: {
  match: { id: string; displayName: string };
  onOpen: () => void;
}) {
  return (
    <p className="text-[12px] text-amber-800">
      Matches{' '}
      <button type="button" className="font-bold underline" onClick={onOpen}>
        {match.displayName}
      </button>
    </p>
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
