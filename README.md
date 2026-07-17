# Club Powerhouse Web (React)

The next-generation frontend for the Powerhouse platform, built with **Next.js (App
Router), React, TypeScript, Zustand, TanStack Query, Tailwind CSS, and shadcn/ui**.

This app is being migrated **incrementally** from the Angular application
(`../club-powerhouse-web`), which remains the production frontend until migration is
complete. Both apps talk to the same Django REST backend — no data is migrated, only UI.

📚 Docs: [ARCHITECTURE.md](ARCHITECTURE.md) · [MIGRATION_PLAN.md](MIGRATION_PLAN.md) ·
[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) · [TECH_STACK.md](TECH_STACK.md) ·
[CONTRIBUTING.md](CONTRIBUTING.md)

## Getting started

Requirements: Node.js 20+ (LTS), npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

Development points at a **local backend** (`http://localhost:8000`) by default — see
`.env.development`. To target another API without committing the change, create
`.env.local`:

```bash
NEXT_PUBLIC_API_HOST=https://<host>/api
NEXT_PUBLIC_AUTH_URL=https://<host>/api/v0/rest-auth
```

## Scripts

| Command                           | Purpose                    |
| --------------------------------- | -------------------------- |
| `npm run dev`                     | Dev server (Turbopack)     |
| `npm run build`                   | Production build           |
| `npm start`                       | Serve the production build |
| `npm run lint`                    | ESLint                     |
| `npm run typecheck`               | `tsc --noEmit`             |
| `npm run format` / `format:check` | Prettier                   |
| `npm run test:e2e`                | Playwright E2E             |

Authenticated E2E specs need `E2E_EMAIL` and `E2E_PASSWORD` (and a reachable API).
Unauthenticated smoke/login specs run without them.

Pre-commit hooks (Husky + lint-staged) run ESLint and Prettier on staged files
automatically.

## Environment variables

All config is validated at boot by `src/shared/lib/env.ts` (Zod) — a missing or invalid
value fails the build/startup instead of breaking silently at runtime.

| Variable                              | Purpose                          |
| ------------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_API_HOST`                | Django REST API root             |
| `NEXT_PUBLIC_AUTH_URL`                | DRF token-auth root              |
| `NEXT_PUBLIC_ASSISTANT_HOST`          | Klikin AI assistant (optional)   |
| `NEXT_PUBLIC_FLAG_COMMAND_CENTER`     | Feature flag: Command Center     |
| `NEXT_PUBLIC_FLAG_PROOF_OF_EXECUTION` | Feature flag: Proof of Execution |

`NEXT_PUBLIC_*` values are inlined into the client bundle — never put secrets in them.

## Current migration status

**Phase: feature parity (near-complete)** — auth, app shell, command palette, Klikin
assistant (when configured), and all navigable routes have real implementations.
The main Angular-only surface left is the **Planning Studio editor** (allocation /
publish); browse/readiness for `/plan` is in React. Shared polish still open: advanced
job filters, photo zip/PDF, bulk job toolbar. See [MIGRATION_PLAN.md](MIGRATION_PLAN.md).
