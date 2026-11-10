# Contributing to Sponsoro CRM

Thank you for helping build the CRM. These conventions keep the codebase safe to change for everyone.

## Before you code

1. Read the relevant section in `docs/specs/crm-feature-spec.md`. If behaviour is not specified, agree it before implementing.
2. Read `.cursor/rules/00-project-context.mdc` and the rules for the layers you touch (04–07, 03 for access).
3. For a new feature, use the checklist in `.cursor/rules/15-feature-completion-checklist.mdc` before calling it done.

## Local setup

See [README.md](./README.md). You need a CRM Neon database, `.env.local`, and `pnpm db:migrate`.

## Commands (run before every PR)

```bash
pnpm typecheck
pnpm lint
pnpm test
```

For database or access changes, include integration tests with RLS enabled (rule **14**).

## Code placement

| You are adding… | Put it in… |
| --- | --- |
| A page or API route | `src/app/` |
| Screen-specific UI | `src/features/<module>/components/` |
| A business rule | `src/domain/<module>/rules.ts` |
| A mutation | `src/server/actions/<module>/` + `src/server/services/<module>/` |
| A query | `src/server/repositories/<module>/` |

Do not put business logic in React components, route handlers, or action bodies beyond wiring.

## Pull requests

Use the template in [.github/pull_request_template.md](./.github/pull_request_template.md). Keep diffs focused; split unrelated work into separate PRs.

## Security

- Identity and `org_id` come from the server session only — never from the client.
- Members see only pipelines and contacts the access layer allows; hidden records return **404**.
- No personal data in logs (rule **12**).

Questions: ask in the team channel or open a draft PR early for design feedback.
