# Sponsoro CRM — agent & developer guide

This repository is **Sponsoro CRM** (`crm.sponsoro.co.uk`), not the compliance app or marketing site.

## Read first

1. **Behaviour:** `docs/specs/crm-feature-spec.md` — if code and spec disagree, stop and ask.
2. **Structure:** `docs/architecture.md` and `.cursor/rules/04-folder-structure-imports.mdc`.
3. **Security:** `.cursor/rules/03-security-tenancy.mdc` — org scoping and RLS on every data path.
4. **Done means:** `.cursor/rules/15-feature-completion-checklist.mdc`.

## Non-negotiables

- Business logic lives in `src/domain/` and `src/server/services/`, never in React or route handlers.
- Every write: session → access → Zod → transaction → audit (rules 07, 22).
- Members get **404** for records they cannot see, not 403.
- Do not add dependencies without asking.

## Verify

```bash
pnpm typecheck && pnpm lint && pnpm test
```

---

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
