# Sponsoro CRM

Lead management CRM at `crm.sponsoro.co.uk`. Separate app and Neon database from Sponsoro compliance (`app.sponsoro.co.uk`). Shares look-and-feel; does not share business tables or users.

## Stack

- Next.js App Router, React, TypeScript (strict), Tailwind v4
- Custom cookie auth (`crm.user` / `crm.session`)
- Drizzle + Neon Postgres (`crm` schema, RLS)
- TanStack Query, Zod, Radix, Lucide

## Quick start

1. Copy `.env.example` → `.env.local` and fill values.
2. Apply `docs/database-setup.md` on your CRM Neon branch.
3. `pnpm install` → `pnpm db:migrate` → `pnpm dev`
4. Open `/sign-up` (first user becomes Admin) or follow `docs/auth-setup.md`.

## Architecture

The repo is organised in **layers** (routes → features → domain → server). Read [docs/architecture.md](./docs/architecture.md) before your first change.

**Product behaviour:** [docs/specs/crm-feature-spec.md](./docs/specs/crm-feature-spec.md)  
**Engineering rules:** `.cursor/rules/` (numbered 00–32 — start with 00, 04, 06, 07, 03)  
**Contributing:** [CONTRIBUTING.md](./CONTRIBUTING.md)

```
src/
├── app/           # Routes only — thin
├── features/      # UI + hooks per module
├── domain/        # Pure rules & Zod — no I/O
├── server/        # Actions, services, repositories, access
├── components/ui/ # Design system
└── lib/           # Shared client helpers
```

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Local dev server |
| `pnpm build` / `pnpm start` | Production build / run |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit & integration |
| `pnpm db:generate` / `pnpm db:migrate` | Drizzle migrations |
| `pnpm db:seed-admin` | Optional one-off Admin seed |

## Docs index

| Doc | Contents |
| --- | --- |
| [docs/architecture.md](./docs/architecture.md) | Layers, request flow, where to put code |
| [docs/auth-setup.md](./docs/auth-setup.md) | Sessions, roles, first login |
| [docs/database-setup.md](./docs/database-setup.md) | Neon, schema, RLS |
| [docs/specs/crm-feature-spec.md](./docs/specs/crm-feature-spec.md) | Feature spec (source of truth) |
