# Contributing

## Setup

```bash
npm install        # installs deps + husky hooks (prepare script)
npm run dev
```

You need a backend to log in: run the Django API locally (default
`http://localhost:8000`) or point `.env.local` at a shared dev API. Never point local
development at production.

## Workflow

1. Branch from `master`: `feat/<topic>`, `fix/<topic>`, `chore/<topic>`.
2. Commit using **Conventional Commits** (`feat: …`, `fix: …`, `refactor: …`, `docs: …`).
3. Pre-commit hooks run ESLint + Prettier on staged files; don't bypass them (`-n`)
   unless the hook itself is broken.
4. Before opening a PR: `npm run typecheck && npm run lint && npm run build`.

## Code standards

- **TypeScript strict; `any` is a lint error.** Prefer `unknown` + narrowing, or a Zod
  schema if the value crosses the API boundary.
- **State placement is architectural** (see [ARCHITECTURE.md](ARCHITECTURE.md)): server
  data in TanStack Query, client state in Zustand. Mirroring API data into a store, or
  fetching outside the API layer, is a review blocker.
- **Follow the folder rules** in [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md): thin
  `app/`, isolated `features/`, shadcn primitives via `npx shadcn@latest add`.
- **Migration parity**: when porting an Angular screen, read its component/bloc/model-set
  first and port behavior 1:1. Intentional divergences go in MIGRATION_PLAN.md. UI
  polish beyond parity waits until after cutover.
- **Accessibility**: interactive elements need accessible names (`aria-label` on
  icon-only buttons), form inputs need `<FieldLabel htmlFor>`, errors set `aria-invalid`.
  Test dialogs and menus with the keyboard.
- **Comments** explain constraints the code can't (ported edge-case semantics, backend
  quirks) — not what the next line does.
- **Security**: no `dangerouslySetInnerHTML` (lint-enforced), no secrets in
  `NEXT_PUBLIC_*`, no tokens outside the session store.

## Adding a feature vertical (migration)

1. Read the Angular implementation (`components/`, `blocs/`, `store/model-sets/` for its
   entities).
2. Create `src/features/<name>/` with `schemas.ts` → `api.ts` (+ query-key factory) →
   `hooks.ts` → `components/`.
3. Replace the `[slug]` placeholder by creating `src/app/(app)/<route-id>/page.tsx`
   (route id must match the Angular route).
4. Work through the "definition of done" checklist in
   [MIGRATION_PLAN.md](MIGRATION_PLAN.md).
