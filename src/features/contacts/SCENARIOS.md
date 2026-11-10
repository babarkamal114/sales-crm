# Contacts dev scenarios (`?scenario=`)

Local-only list fixtures (see `contactsDevFixturesEnabled`). E2E runs with real data and ignores these.

| URL | Purpose | Maps to |
|-----|---------|---------|
| `/contacts?scenario=empty` | Empty org list states | C12 empty, onboarding |
| `/contacts?scenario=display-fallbacks` | Long names, email/phone/unnamed display | C13 |
| `/contacts?scenario=list-populated` | Sample rows with deal column | Demo / screenshots |

Real database scenarios (integration tests or manual):

| ID | How to verify |
|----|----------------|
| C1 | `contact-access.int.test.ts` — member URL → not found |
| C2 | `list-contacts.int.test.ts` — member list scope |
| C3 | E2E duplicate dialog; members lack “Create anyway” |
| C4 | `contacts-rules.test.ts` — phone normalisation |
| C5 | W1 suppression toast (manual + create service) |
| C6 | `contacts-rules.test.ts` — merge SMS DND |
| C7–C8 | Planned (import job, bulk composer) |
| C9 | Planned (realtime stale drawer) |
| C10 | Restrict contact on lead profile |
| C11 | W10 erase action + audit (E2E smoke) |
| C12 | `pnpm contacts:perf` on large seed |
| C14–C15 | E2E axe + manual 390px |
| C16 | `create-or-match-contact.int.test.ts` |
