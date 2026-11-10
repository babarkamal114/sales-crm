# F15 Contacts — Phase 8 pre-PR review (rule 15)

## Check results

| Command | Result |
|---------|--------|
| `pnpm typecheck` | Run before merge |
| `pnpm lint` | Run before merge |
| `pnpm test` | Unit + integration (integration needs `TEST_DATABASE_URL`) |
| `pnpm test:e2e:contacts` | Optional locally with `E2E_ADMIN_*` + `pnpm build` |
| `pnpm contacts:perf` | Optional; meaningful C12 needs large seed |
| Migrations | `0006_contacts_f15.sql` — indexes for list/sort |

## Findings

| Severity | Item | Notes |
|----------|------|-------|
| Should fix | C7/C8/C9/C12 at scale | Import job, bulk send, realtime stale UI, `db:seed:large` not wired yet |
| Should fix | W7 “Add deal” | Button disabled only when restricted; create dialog not pre-filled |
| Suggestion | Mobile E2E | Add 390px Playwright project when lead shell stabilises |
| Suggestion | Attribution on inbound match | C16 test covers match; latest-touch writers still minimal |

No blockers identified for merging the F15 list/drawer/lead/companies/workflows slice if typecheck, lint, and tests pass.

## Rule 15 checklist (summary)

| Item | Status |
|------|--------|
| Tenancy / RLS on contact paths | Done — access + list integration tests |
| Consent on send surfaces | Partial — DND in UI; bulk composer deferred |
| Domain vs UI boundaries | Done |
| Audit on mutations | Done in services |
| Indexes for list queries | Done in migration 0006 |
| UI states (empty/error/loading) | Done on list |
| Tests for access | Done for core paths |
| Env documented | `.env.example` E2E vars |

## PR description (draft)

### Summary

- Contacts list, quick view, lead page, companies, and workflow UI (W1/W2/W4/W10).
- Phase 8: dev list fixtures (`?scenario=`), Playwright journeys, perf script, scenario docs.

### Test plan

- [ ] `pnpm typecheck && pnpm test`
- [ ] With `TEST_DATABASE_URL`: integration tests green
- [ ] `/contacts?scenario=display-fallbacks` in local dev
- [ ] Optional: `E2E_ADMIN_*` + `pnpm build` + `pnpm test:e2e:contacts`

**Merge readiness:** Ready when CI checks pass and no open blockers above.
