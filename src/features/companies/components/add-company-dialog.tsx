'use client';

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { normaliseCompanyName } from '@/domain/companies/normalise-company-name';
import { normaliseDomain } from '@/domain/companies/normalise-domain';
import {
  COMPANY_COUNTRY_OPTIONS,
  COMPANY_INDUSTRY_OPTIONS,
  COMPANY_LIFECYCLE_OPTIONS,
  COMPANY_RECIPIENT_OPTIONS,
  COMPANY_SIZE_BANDS,
} from '@/domain/companies/form-constants';
import { isFreeMailDomain } from '@/domain/companies/is-free-mail-domain';
import { createCompanySchema } from '@/domain/companies/schemas';
import { createCompanyAction } from '@/server/actions/companies/create-company';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Member = { id: string; fullName: string };
type Tag = { id: string; name: string; colourKey: string };

const emptyForm = () => ({
  name: '',
  website: '',
  phone: '',
  industry: '',
  sizeBand: '',
  ownerId: '',
  lifecycle: 'prospect',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postcode: '',
  country: 'GB',
  companiesHouseNumber: '',
  extraDomainsText: '',
  linkedinUrl: '',
  description: '',
  parentCompanyId: null as string | null,
  parentQuery: '',
  recipientType: 'corporate',
  tagIds: [] as string[],
  followerIds: [] as string[],
});

export function AddCompanyDialog({
  open,
  onOpenChange,
  onCreated,
  defaultName,
  role,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
  defaultName?: string;
  role: string;
  userId: string;
}) {
  const [form, setForm] = useState(emptyForm);
  const [addressOpen, setAddressOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [domainClash, setDomainClash] = useState<{ id: string; name: string } | null>(null);
  const [nameHint, setNameHint] = useState<{ id: string; name: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [parentMatches, setParentMatches] = useState<
    { id: string; name: string; domain: string | null }[]
  >([]);

  const canPickOwner = role === 'admin' || role === 'manager';

  useEffect(() => {
    if (!open) return;
    setForm({ ...emptyForm(), name: defaultName ?? '', ownerId: userId });
    setFieldErrors({});
    setDomainClash(null);
    setNameHint(null);
  }, [open, defaultName, userId]);

  useEffect(() => {
    if (!open) return;
    void fetch('/api/v1/tags')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: Tag[] }) => setTags(d.items ?? []));
    if (canPickOwner) {
      void fetch('/api/v1/org/members')
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d: { items: Member[] }) => setMembers(d.items ?? []));
    }
  }, [open, canPickOwner]);

  useEffect(() => {
    const domain = normaliseDomain(form.website);
    if (!domain || isFreeMailDomain(domain)) {
      setDomainClash(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/v1/companies/search?q=${encodeURIComponent(domain)}&limit=8`)
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((data: { items: { id: string; name: string; domain: string | null }[] }) => {
          const match = data.items.find((item) => item.domain?.toLowerCase() === domain);
          setDomainClash(match ? { id: match.id, name: match.name } : null);
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [form.website]);

  useEffect(() => {
    const trimmed = form.name.trim();
    if (trimmed.length < 2) {
      setNameHint(null);
      return;
    }
    const normalised = normaliseCompanyName(trimmed);
    const timer = window.setTimeout(() => {
      void fetch(`/api/v1/companies/search?q=${encodeURIComponent(trimmed)}&limit=8`)
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((data: { items: { id: string; name: string }[] }) => {
          const match = data.items.find(
            (item) => normaliseCompanyName(item.name) === normalised,
          );
          setNameHint(match ? { id: match.id, name: match.name } : null);
        });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [form.name]);

  useEffect(() => {
    if (!form.parentQuery.trim()) {
      setParentMatches([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void fetch(`/api/v1/companies/search?q=${encodeURIComponent(form.parentQuery.trim())}`)
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d: { items: { id: string; name: string; domain: string | null }[] }) =>
          setParentMatches(d.items),
        );
    }, 200);
    return () => window.clearTimeout(timer);
  }, [form.parentQuery]);

  const websiteError = useMemo(() => {
    const raw = form.website.trim();
    if (!raw) return null;
    if (isFreeMailDomain(raw)) {
      return 'Personal email domains cannot be used as a company website.';
    }
    const domain = normaliseDomain(raw);
    if (!domain) return 'Enter a valid website or domain.';
    return null;
  }, [form.website]);

  const patch = (partial: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...partial }));

  const toggleTag = (tagId: string) => {
    setForm((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  const toggleFollower = (memberId: string) => {
    setForm((prev) => ({
      ...prev,
      followerIds: prev.followerIds.includes(memberId)
        ? prev.followerIds.filter((id) => id !== memberId)
        : [...prev.followerIds, memberId],
    }));
  };

  const buildPayload = (forceCreate?: boolean) => {
    const extraDomains = form.extraDomainsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      name: form.name.trim(),
      website: form.website.trim() || undefined,
      phone: form.phone.trim() || undefined,
      industry: form.industry || undefined,
      sizeBand: form.sizeBand || undefined,
      ownerId: canPickOwner && form.ownerId ? form.ownerId : undefined,
      lifecycle: form.lifecycle as 'prospect' | 'customer' | 'former_customer' | 'not_a_fit',
      addressLine1: form.addressLine1.trim() || undefined,
      addressLine2: form.addressLine2.trim() || undefined,
      city: form.city.trim() || undefined,
      postcode: form.postcode.trim() || undefined,
      country: form.country || 'GB',
      companiesHouseNumber: form.companiesHouseNumber.trim() || undefined,
      extraDomains,
      linkedinUrl: form.linkedinUrl.trim() || undefined,
      description: form.description.trim() || undefined,
      parentCompanyId: form.parentCompanyId,
      recipientType: form.recipientType as 'corporate' | 'individual',
      tagIds: form.tagIds,
      followerIds: form.followerIds,
      forceCreate,
    };
  };

  const save = (forceCreate = false) => {
    const payload = buildPayload(forceCreate);
    const parsed = createCompanySchema.safeParse(payload);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]?.toString() ?? 'form';
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      toast.error(errors.form ?? errors.name ?? 'Check the highlighted fields.');
      return;
    }
    if (domainClash && !forceCreate) {
      toast.error(`This domain belongs to ${domainClash.name}.`);
      return;
    }
    if (websiteError) {
      toast.error(websiteError);
      return;
    }

    startTransition(async () => {
      const result = await createCompanyAction(parsed.data);
      if (!result.ok) {
        if (result.error.code === 'CONFLICT') {
          toast.error(result.error.message);
          return;
        }
        toast.error(result.error.message);
        return;
      }
      toast.success('Company created', {
        description: 'Open the company to add custom fields or link contacts.',
      });
      onOpenChange(false);
      setForm(emptyForm());
      onCreated(result.data.id);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,820px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-line px-5 py-4">
          <DialogTitle>Add company</DialogTitle>
          <DialogDescription>
            Main details are required. Address and more fields can stay empty.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            <FormField label="Company name" required error={fieldErrors.name}>
              <Input
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Cedar Legal"
                autoFocus
                maxLength={200}
              />
              {nameHint ? (
                <p className="mt-1.5 text-[12px] text-amber-800">
                  Similar name exists: <strong>{nameHint.name}</strong>. You can still save if this
                  is a different business.
                </p>
              ) : null}
            </FormField>

            <FormField label="Website" error={fieldErrors.website ?? websiteError ?? undefined}>
              <Input
                value={form.website}
                onChange={(e) => patch({ website: e.target.value })}
                placeholder="https://www.example.co.uk"
              />
              {domainClash ? (
                <p className="mt-1.5 text-[12px] text-rose-800">
                  Domain already used by <strong>{domainClash.name}</strong>. Choose another website
                  or open that company.
                </p>
              ) : null}
            </FormField>

            <FormField label="Phone" error={fieldErrors.phone}>
              <Input
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                placeholder="07… or +44…"
              />
            </FormField>

            <FormField label="Industry" error={fieldErrors.industry}>
              <Select
                value={form.industry}
                onChange={(e) => patch({ industry: e.target.value })}
              >
                <option value="">Select industry</option>
                {COMPANY_INDUSTRY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Company size" error={fieldErrors.sizeBand}>
              <Select
                value={form.sizeBand}
                onChange={(e) => patch({ sizeBand: e.target.value })}
              >
                <option value="">Select size</option>
                {COMPANY_SIZE_BANDS.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label} employees
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Owner" required error={fieldErrors.ownerId}>
              {canPickOwner ? (
                <Select
                  value={form.ownerId || userId}
                  onChange={(e) => patch({ ownerId: e.target.value })}
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.fullName}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input value="You" disabled readOnly className="bg-soft/50" />
              )}
            </FormField>

            <FormField label="Status" error={fieldErrors.lifecycle}>
              <Select
                value={form.lifecycle}
                onChange={(e) => patch({ lifecycle: e.target.value })}
              >
                {COMPANY_LIFECYCLE_OPTIONS.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <CollapsibleSection
            title="Address"
            open={addressOpen}
            onToggle={() => setAddressOpen((v) => !v)}
            defaultOpenHint
          >
            <div className="space-y-3 pt-1">
              <FormField label="Address line 1" error={fieldErrors.addressLine1}>
                <Input
                  value={form.addressLine1}
                  onChange={(e) => patch({ addressLine1: e.target.value })}
                />
              </FormField>
              <FormField label="Address line 2" error={fieldErrors.addressLine2}>
                <Input
                  value={form.addressLine2}
                  onChange={(e) => patch({ addressLine2: e.target.value })}
                />
              </FormField>
              <FormField label="Town or city" error={fieldErrors.city}>
                <Input value={form.city} onChange={(e) => patch({ city: e.target.value })} />
              </FormField>
              <FormField label="Postcode" error={fieldErrors.postcode}>
                <Input
                  value={form.postcode}
                  onChange={(e) => patch({ postcode: e.target.value })}
                  placeholder="SW1A 1AA"
                />
              </FormField>
              <FormField label="Country" error={fieldErrors.country}>
                <Select
                  value={form.country}
                  onChange={(e) => patch({ country: e.target.value })}
                >
                  {COMPANY_COUNTRY_OPTIONS.map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="More details"
            open={moreOpen}
            onToggle={() => setMoreOpen((v) => !v)}
          >
            <div className="space-y-3 pt-1">
              <FormField
                label="Companies House number"
                error={fieldErrors.companiesHouseNumber}
              >
                <Input
                  value={form.companiesHouseNumber}
                  onChange={(e) => patch({ companiesHouseNumber: e.target.value.toUpperCase() })}
                  placeholder="12345678 or SC123456"
                  maxLength={8}
                />
              </FormField>

              <FormField label="Other websites" error={fieldErrors.extraDomains}>
                <Textarea
                  value={form.extraDomainsText}
                  onChange={(e) => patch({ extraDomainsText: e.target.value })}
                  placeholder="One domain per line or comma-separated"
                  className="min-h-[80px]"
                />
              </FormField>

              <FormField label="LinkedIn page" error={fieldErrors.linkedinUrl}>
                <Input
                  value={form.linkedinUrl}
                  onChange={(e) => patch({ linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/company/…"
                />
              </FormField>

              <FormField label="Description" error={fieldErrors.description}>
                <Textarea
                  value={form.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  maxLength={2000}
                  className="min-h-[100px]"
                />
              </FormField>

              <FormField label="Parent company" error={fieldErrors.parentCompanyId}>
                <Input
                  value={form.parentQuery}
                  onChange={(e) =>
                    patch({
                      parentQuery: e.target.value,
                      parentCompanyId: null,
                    })
                  }
                  placeholder="Search companies…"
                />
                {parentMatches.length > 0 && !form.parentCompanyId ? (
                  <ul className="mt-1 max-h-32 overflow-y-auto rounded-xl border border-line bg-white">
                    {parentMatches.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-[13px] hover:bg-soft"
                          onClick={() =>
                            patch({
                              parentCompanyId: row.id,
                              parentQuery: row.name,
                            })
                          }
                        >
                          {row.name}
                          {row.domain ? (
                            <span className="text-ink-500"> · {row.domain}</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </FormField>

              <FormField label="Recipient type" error={fieldErrors.recipientType}>
                <Select
                  value={form.recipientType}
                  onChange={(e) => patch({ recipientType: e.target.value })}
                >
                  {COMPANY_RECIPIENT_OPTIONS.map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              {tags.length > 0 ? (
                <div>
                  <Label className="text-[12px] font-semibold text-ink-500">Tags</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.map((tag) => {
                      const selected = form.tagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          className={cn(
                            'rounded-full border px-3 py-1 text-[12px] font-semibold',
                            selected
                              ? 'border-brand-300 bg-brand-50 text-brand-700'
                              : 'border-line bg-white text-ink-700',
                          )}
                          onClick={() => toggleTag(tag.id)}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {canPickOwner && members.length > 0 ? (
                <div>
                  <Label className="text-[12px] font-semibold text-ink-500">Followers</Label>
                  <div className="mt-2 max-h-36 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
                    {members.map((member) => (
                      <label
                        key={member.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-soft"
                      >
                        <input
                          type="checkbox"
                          checked={
                            member.id === userId || form.followerIds.includes(member.id)
                          }
                          disabled={member.id === userId}
                          onChange={() => toggleFollower(member.id)}
                        />
                        {member.fullName}
                        {member.id === userId ? (
                          <span className="text-[11px] text-ink-400">(you)</span>
                        ) : null}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <p className="text-[12px] text-ink-500">
                Custom fields from your organisation settings can be completed on the company page
                after save.
              </p>
            </div>
          </CollapsibleSection>
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || Boolean(domainClash) || Boolean(websiteError)}
            onClick={() => save(false)}
          >
            {pending ? 'Saving…' : 'Save company'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null | undefined;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[12px] font-semibold text-ink-500">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </span>
      {children}
      {error ? <span className="text-[12px] font-medium text-rose-700">{error}</span> : null}
    </label>
  );
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
  defaultOpenHint,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  defaultOpenHint?: boolean;
}) {
  return (
    <div className="mt-6 border-t border-line pt-4">
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left text-[13px] font-bold text-ink-900"
        onClick={onToggle}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="size-4 text-ink-500" />
        ) : (
          <ChevronRight className="size-4 text-ink-500" />
        )}
        {title}
        {defaultOpenHint && !open ? (
          <span className="ml-auto text-[11px] font-medium text-ink-400">Has fields</span>
        ) : null}
      </button>
      {open ? children : null}
    </div>
  );
}
