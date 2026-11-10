'use client';

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { CompanyDetail } from '@/domain/companies/detail-view';
import { normaliseDomain } from '@/domain/companies/normalise-domain';
import {
  COMPANY_COUNTRY_OPTIONS,
  COMPANY_INDUSTRY_OPTIONS,
  COMPANY_LIFECYCLE_OPTIONS,
  COMPANY_SIZE_BANDS,
} from '@/domain/companies/form-constants';
import { isFreeMailDomain } from '@/domain/companies/is-free-mail-domain';
import { updateCompanyDetailsSchema } from '@/domain/companies/schemas';
import { updateCompanyDetailsAction } from '@/server/actions/companies/update-company';
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

function formFromCompany(company: CompanyDetail) {
  return {
    name: company.name,
    website: company.domain ?? company.websiteUrl ?? '',
    phone: company.phoneE164 ?? '',
    industry: company.industry ?? '',
    sizeBand: company.sizeBand ?? '',
    ownerId: company.owner.id,
    lifecycle: company.lifecycle,
    addressLine1: company.addressLine1 ?? '',
    addressLine2: company.addressLine2 ?? '',
    city: company.city ?? '',
    postcode: company.postcode ?? '',
    country: company.country || 'GB',
    companiesHouseNumber: company.companiesHouseNumber ?? '',
    linkedinUrl: company.linkedinUrl ?? '',
    description: company.description ?? '',
    tagIds: company.tags.map((t) => t.id),
  };
}

export function EditCompanyDialog({
  open,
  onOpenChange,
  company,
  canPickOwner,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: CompanyDetail;
  canPickOwner: boolean;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() => formFromCompany(company));
  const [addressOpen, setAddressOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    if (!open) return;
    setForm(formFromCompany(company));
    setFieldErrors({});
    void fetch('/api/v1/tags')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items: Tag[] }) => setTags(d.items ?? []));
    if (canPickOwner) {
      void fetch('/api/v1/org/members')
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d: { items: Member[] }) => setMembers(d.items ?? []));
    }
  }, [open, company, canPickOwner]);

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

  const save = () => {
    if (websiteError) {
      toast.error(websiteError);
      return;
    }

    const payload = {
      companyId: company.id,
      version: company.version,
      name: form.name.trim(),
      website: form.website.trim() || undefined,
      phone: form.phone.trim() || undefined,
      industry: form.industry || undefined,
      sizeBand: form.sizeBand || undefined,
      ownerId: form.ownerId,
      lifecycle: form.lifecycle,
      addressLine1: form.addressLine1.trim() || undefined,
      addressLine2: form.addressLine2.trim() || undefined,
      city: form.city.trim() || undefined,
      postcode: form.postcode.trim() || undefined,
      country: form.country || 'GB',
      companiesHouseNumber: form.companiesHouseNumber.trim() || undefined,
      linkedinUrl: form.linkedinUrl.trim() || undefined,
      description: form.description.trim() || undefined,
      tagIds: form.tagIds,
    };

    const parsed = updateCompanyDetailsSchema.safeParse(payload);
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

    startTransition(async () => {
      const result = await updateCompanyDetailsAction(parsed.data);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Company updated');
      onOpenChange(false);
      onSaved();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,820px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-line px-5 py-4">
          <DialogTitle>Edit company</DialogTitle>
          <DialogDescription>
            Update profile, CRM fields, and tags. Changes apply when you save.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            <FormField label="Company name" required error={fieldErrors.name}>
              <Input
                value={form.name}
                onChange={(e) => patch({ name: e.target.value })}
                maxLength={200}
              />
            </FormField>

            <FormField label="Website" error={fieldErrors.website ?? websiteError ?? undefined}>
              <Input
                value={form.website}
                onChange={(e) => patch({ website: e.target.value })}
                placeholder="https://www.example.co.uk"
              />
            </FormField>

            <FormField label="Phone" error={fieldErrors.phone}>
              <Input
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                placeholder="07… or +44…"
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Industry" error={fieldErrors.industry}>
                <Select value={form.industry} onChange={(e) => patch({ industry: e.target.value })}>
                  <option value="">Select industry</option>
                  {COMPANY_INDUSTRY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Company size" error={fieldErrors.sizeBand}>
                <Select value={form.sizeBand} onChange={(e) => patch({ sizeBand: e.target.value })}>
                  <option value="">Select size</option>
                  {COMPANY_SIZE_BANDS.map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label} employees
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Lifecycle" error={fieldErrors.lifecycle}>
                <Select
                  value={form.lifecycle}
                  onChange={(e) => patch({ lifecycle: e.target.value as typeof form.lifecycle })}
                >
                  {COMPANY_LIFECYCLE_OPTIONS.map((row) => (
                    <option key={row.value} value={row.value}>
                      {row.label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Owner" required error={fieldErrors.ownerId}>
                {canPickOwner && members.length > 0 ? (
                  <Select value={form.ownerId} onChange={(e) => patch({ ownerId: e.target.value })}>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.fullName}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input value={company.owner.fullName} disabled readOnly className="bg-soft/50" />
                )}
              </FormField>
            </div>
          </div>

          <CollapsibleSection
            title="Address"
            open={addressOpen}
            onToggle={() => setAddressOpen((v) => !v)}
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
              <div className="grid gap-3 sm:grid-cols-2">
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
              </div>
              <FormField label="Country" error={fieldErrors.country}>
                <Select value={form.country} onChange={(e) => patch({ country: e.target.value })}>
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
            title="Registration & notes"
            open={moreOpen}
            onToggle={() => setMoreOpen((v) => !v)}
          >
            <div className="space-y-3 pt-1">
              <FormField label="Companies House number" error={fieldErrors.companiesHouseNumber}>
                <Input
                  value={form.companiesHouseNumber}
                  onChange={(e) =>
                    patch({ companiesHouseNumber: e.target.value.toUpperCase() })
                  }
                  placeholder="12345678"
                  maxLength={16}
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
                            'rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors',
                            selected
                              ? 'border-brand-300 bg-brand-50 text-brand-700'
                              : 'border-line bg-white text-ink-700 hover:border-brand-200',
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
            </div>
          </CollapsibleSection>
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={pending || Boolean(websiteError)} onClick={save}>
            {pending ? 'Saving…' : 'Save changes'}
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
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
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
      </button>
      {open ? children : null}
    </div>
  );
}
