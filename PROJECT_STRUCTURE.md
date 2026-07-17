# Project Structure & Conventions

```
src/
├── app/                       # Next.js App Router — routes, layouts, error UI ONLY
│   ├── (auth)/login/          # public auth pages
│   ├── (app)/                 # authenticated area (guard + shell in layout.tsx)
│   │   ├── dashboard/
│   │   ├── [slug]/            # placeholder for not-yet-migrated pages
│   │   └── error.tsx          # error boundary for the authenticated area
│   ├── layout.tsx             # root layout (fonts, providers)
│   └── page.tsx               # / → /dashboard redirect
├── features/                  # vertical slices — a feature owns its UI, hooks, api, schemas
│   └── auth/
│       ├── api.ts             # endpoint functions (validated with Zod at the boundary)
│       ├── hooks.ts           # useLogin / useLogout / useSession
│       ├── schemas.ts         # Zod schemas + inferred types
│       ├── types.ts           # roles, role labels, landing-page rules
│       └── components/        # feature-private components
├── shared/                    # cross-feature building blocks (no business logic)
│   ├── components/
│   │   ├── ui/                # shadcn/ui primitives (managed by `npx shadcn add`)
│   │   └── *.tsx              # composites: EmptyState, ErrorState, LoadingState, PageHeader
│   ├── hooks/                 # useMediaQuery, …
│   ├── services/api/          # HTTP client, error normalization
│   ├── lib/                   # env, query-client, utils
│   ├── constants/             # pages/navigation registry
│   ├── providers/             # AppProviders (query client, toaster)
│   ├── types/                 # global types only
│   └── utils/
├── layouts/                   # app chrome (AppShell)
├── stores/                    # Zustand stores (session, ui) — client state only
├── styles/                    # (reserved) extra stylesheets beyond app/globals.css
└── proxy.ts                   # edge proxy (auth checks once cookie sessions land)
```

## Rules

1. **`app/` stays thin.** Route files compose feature components; they contain no
   business logic, no fetching beyond wiring.
2. **Features don't import each other.** A feature may import from `shared/`, `stores/`,
   and `layouts/` — never from a sibling feature. Promote genuinely shared code to `shared/`.
3. **Server state in TanStack Query, client state in Zustand.** Never mirror API
   responses into a store.
4. **Validate at the boundary.** Every API response passes through a Zod schema in the
   feature's `api.ts` before it enters the app.
5. **`shared/components/ui` is shadcn-managed.** Add primitives with
   `npx shadcn@latest add <name>` (aliases in `components.json` point here); customize
   freely afterward — the files are ours.
6. **Route ids match the Angular app** (`/dashboard`, `/review`, `/speed-review`, …) so
   deep links survive the cutover. New verticals replace the `[slug]` placeholder with a
   real directory of the same name.

## Naming

- Files: `kebab-case.tsx` / `kebab-case.ts`; components exported in `PascalCase`.
- Hooks: `use-*.ts` exporting `useX`.
- Zustand stores: `*-store.ts` exporting `useXStore`.
- Path aliases: `@/features/*`, `@/shared/*`, `@/stores/*`, `@/layouts/*`.
