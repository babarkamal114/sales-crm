# Contacts workflows (F15)

Each workflow is the behaviour from the feature spec. Status reflects **this branch** after Phases 1–7.

---

## Phase 7 — Workflow journeys (UI wired)

| Workflow | UI entry | Backend | Notes |
|----------|----------|---------|--------|
| **W1** Add contact | Contacts → Add contact | `createContactAction` | Company search/create, duplicate conflict, suppression toast |
| **W2** Import CSV | Contacts → Import → `/contacts/import` | `dashboardImportLeadsAction` | Same CSV as onboarding; job/undo/mapping deferred |
| **W4** Merge duplicates | Lead page banner → Review merge | `mergeContactsAction` | Admin/manager; primary = open profile |
| **W10** Erasure | Lead → Actions → Erase (GDPR) | `eraseContactAction` | Admin; type display name to confirm |
| **W10** Export (SAR) | Lead → Actions → Export | `requestContactExportAction` | Queues audit; ZIP job deferred |

Other workflows (W3, W5–W9, W11–W12) are summarised below with honest partial/ planned flags.

---

## W1. Add a contact manually — **Implemented**

1. Open **Add contact** on `/contacts` (shortcuts **N**).
2. Enter first/last name, email, phone; optional **company** (search existing, pick from list, or create on save).
3. On save, normalised email/phone duplicate check → **Open it** or **Create anyway** (admin/manager only).
4. If email/phone matches **suppression**, contact is still created but all channels get DND + warning toast.
5. Success opens quick view (`?contact=`) and refreshes the list.

**Not yet:** tags, consent toggles, “also create opportunity” on create.

---

## W2. Import contacts (CSV) — **Partial (usable slice)**

1. **Contacts → Import** → `/contacts/import`.
2. Drop or paste CSV (template download, row preview, validation errors).
3. Import runs via `dashboardImportLeadsAction` (contact + optional deal per row, same as dashboard/onboarding).
4. On success, return to `/contacts`.

**Planned:** column mapping UI, consent column mapping, background job, progress email, undo import (24h), suppression skip rules in results.

---

## W3. Inbound contact creation — **Implemented (API/service)**

All inbound paths should call `createOrMatchContact` (`POST /api/v1/contacts/inbound`, `createOrMatchContactAction`).

- Match on normalised email/phone; update latest attribution only when writers exist.
- New contacts: default owner = session user unless routing is added per source.

---

## W4. Find and merge duplicates — **Partial (core UI)**

1. Open a contact **full profile** (`/contacts/[id]/…`).
2. If duplicates exist, amber **Possible duplicates** banner (from `GET …/duplicates`).
3. Admin/manager: **Review merge** → choose secondary record → **Merge** (`mergeContactsAction`).
4. Consent union rule in domain/service (DND preserved).

**Planned:** dedicated duplicates screen, side-by-side field choices, “not a duplicate” dismiss, async job for large merges.

---

## W5. Ownership and assignment — **Partial**

- Single contact: `setContactOwnerAction` (lead panel / drawer — owner display only; reassign UI planned).
- **List bulk:** change owner (admin/manager) via bulk bar + `/api/v1/org/members`.
- Members: cannot bulk-change owner (backend enforced).

---

## W6. Consent and DND — **Partial**

- Quick view + lead panel: **Manage** consent dialog (`setContactConsentAction`), history in DB.
- List/drawer: `canContactSummary` icons and disabled actions with reasons.
- Bulk DND with reason — planned.

---

## W7. Contact to opportunity — **Partial**

- Open existing deals from drawer, lead tabs, company detail → `/opportunities?deal=`.
- **Add deal** buttons present; pre-filled create dialog from contacts — planned (reuse opportunities create).

---

## W8. Lifecycle and follow-up — **Partial**

- Smart list **No next step** (`next_task_due_at` + activity rules in list filter).
- Drawer/lead banner for next step / overdue.
- Automatic lifecycle on won/lost deals — domain rule exists; opportunity hooks planned.

---

## W9. Delete, restore, restrict — **Implemented (actions + lead UI)**

- **Delete** / **Restrict** on lead profile Actions (admin/manager).
- Soft delete + `restoreContactAction` (API; “Recently deleted” smart list planned).
- Restricted contacts: banner on lead header; excluded from bulk where enforced in services.

---

## W10. Data subject requests — **Partial**

**Export (SAR):**

1. Admin/manager: lead profile → Actions → **Export (SAR)**.
2. `requestContactExportAction` writes audit metadata; file generation job planned.

**Erasure:**

1. Admin: lead profile → Actions → **Erase (GDPR)**.
2. Type exact **display name** → `eraseContactAction` (PII redaction, suppression list, audit).
3. Redirect to `/contacts`.

---

## W11. Email to contacts — **Implemented (Google Mail)**

1. **Getting started → Integrations → Google Mail** — OAuth connect (uses `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`; sends as the connected Gmail / Workspace inbox).
2. **Settings → Email templates** — default message per outreach step; edit, add, or delete templates.
3. **Email workspace** — `/contacts/[id]/email` (tab **Email**); also from drawer **Email**, header **Email**, or bulk **Send email** (`?bulk=id1,id2` for multi-send). Step templates, token commands, preview, history, **⌘+Enter** to send.
4. **Send** — consent/DND check, merge tokens, **Gmail API** send, log to `contact_email_send` and activity. Replies go to the sender’s Google address; `Reply-To` is the CRM user’s email when set on their profile.

**Requires:** Google OAuth env vars + org **Google Mail** integration connected (not Resend).

---

## W12. Export contacts (list filter) — **Planned**

- Bulk/export job to R2 with audit of filter + columns — not in UI yet (`bulkContactAction` export stub in schema).

---

## Phase 8 — Scenarios and quality (done on branch)

| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| C1 | Member opens invisible contact by URL | 404 / not found | `contact-access.int.test.ts` |
| C2 | Member search / list | Visible rows only | `list-contacts.int.test.ts` |
| C3 | Duplicate email on create | Conflict UI | E2E + W1 |
| C4 | Phone normalisation | Same E.164 | `contacts-rules.test.ts` |
| C5 | Suppressed re-import | DND on create + toast | W1 (manual) |
| C6 | Merge with SMS DND | Merged keeps DND | `contacts-rules.test.ts` |
| C7 | 50k import job | Job + error CSV | **Planned** |
| C8 | Bulk email 500 / DND | Pre-send summary | Partial (email check) |
| C9 | Deleted while drawer open | Stale message | **Planned** (realtime) |
| C10 | Restricted contact | Actions disabled | Lead UI + backend |
| C11 | Full erasure | No PII + suppression | W10 E2E smoke |
| C12 | 200k list perf | <300ms page | `pnpm contacts:perf` (+ `db:seed:large` when added) |
| C13 | Long/missing names | Fallback display | `?scenario=display-fallbacks` + domain |
| C14 | Keyboard/a11y | Usable list + drawer | E2E axe on W1/W2/W7 |
| C15 | Mobile 390px | Scroll + sheet | Manual / future viewport project |
| C16 | Inbound match | No duplicate row | `create-or-match-contact.int.test.ts` |

**Dev fixtures:** [`SCENARIOS.md`](./SCENARIOS.md) — `?scenario=empty|display-fallbacks|list-populated` on `/contacts`.

**Automation:**

- Playwright: `pnpm test:e2e:contacts` (needs `E2E_ADMIN_*`, build + DB)
- Performance: `pnpm contacts:perf`
- Pre-PR notes: [`PHASE8-REVIEW.md`](./PHASE8-REVIEW.md)

---

## Build phases (reference)

Phases **2–6** backend/UI are documented in git history and prior sections; core surfaces:

- **List** `/contacts` — Phase 3  
- **Quick view** `?contact=` — Phase 4  
- **Lead page** `/contacts/[id]` — Phase 5  
- **Companies** `/companies` — Phase 6  
