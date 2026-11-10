# Companies workflows (F7 / F15)

Status reflects **Phases 1, 4 and 6 (partial)** on this branch.

---

## W1. Add a company manually — **Partial**

1. **Companies → Add company** (shortcut **N**).
2. Enter name and domain/website; domain is normalised on save (`normaliseDomain`).
3. **Planned:** live duplicate banner (domain / Companies House / weak name+city), Companies House lookup, tags, optional contact and deal on create, “Create anyway” for admins on strong matches.
4. Save → toast, list refresh, quick view opens (`?company=`).

**Implemented:** create dialog, audit `company.created`, quick view entry.

---

## W2. Companies from contacts — **Planned**

1. Business email on contact create/import suggests company by domain (`isFreeMailDomain` blocks free mail).
2. “Create company” from contact company field.
3. Org setting **Auto-link contacts by email domain** (default on).

**Implemented (domain only):** `isFreeMailDomain`, `normaliseDomain`, `suggest company from email` service deferred.

---

## W3. Import companies (CSV) — **Planned**

1. Reuse contacts import shell with company field map and duplicate rules.
2. Job, preview, undo import (24h).
3. Contacts import **Company** column links or creates companies.

**Implemented:** Import button routes to existing `/contacts/import` until company mapper lands.

---

## W4. Find and merge duplicates — **Partial**

1. Amber duplicate banner in quick view when another company shares the domain.
2. **Planned:** Duplicates screen (Companies tab), side-by-side merge, dismiss pair, async job for large merges.

**Implemented:** domain strong-match hint in quick view; domain rules and `mergeCompanies` pure function + `company_merge_log` table.

---

## W5. People at a company — **Partial**

Link/add/unlink/set primary/role on company detail and drawer — **Done** (add new, link existing, primary, role, unlink).
Full **company page** (`/companies/[id]`) — stats, editable fields, tags, owner, lifecycle, duplicate merge, deals, people (consent icons), audit activity feed, delete — **Done** (Mar 2026 wiring pass).
Org **auto-link by email domain** — **Done** (`/settings/crm`, migration 0012).
Add contact **suggest create company** from domain — **Done** (banner + save creates company).

---

## W6–W10 — **Partial**

- **Bulk tag / change owner / delete / export** on Companies list — **Done** (`bulkCompanyAction`, bulk bar).
- **Merge two selected companies** — **Done** (merge dialog + `mergeCompanies` service + `company_merge_log`).
- **Restore deleted company, CSV file delivery for export, async bulk &gt;50** — **Planned**.

---

## Scenario hooks (Phase 7)

`?scenario=` fixtures for K1–K17 — not yet wired for companies.
