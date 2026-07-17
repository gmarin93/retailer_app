# Architecture

Design decisions for this application. Folder conventions live in
[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md); per-technology rationale in
[TECH_STACK.md](TECH_STACK.md). The full pre-migration analysis of the Angular app
(technical debt, target architecture, phased roadmap) lives in the Angular repo:
`../club-powerhouse-web/{TECHNICAL_DEBT,TARGET_ARCHITECTURE,FRONTEND_MIGRATION_PLAN}.md`.

## Rendering model

This is a **fully authenticated, data-live dashboard** — there are no public, cacheable
pages. Consequently:

- **Server Components** render static chrome (layouts, placeholder pages) with zero
  client JS.
- **Client Components** handle everything data-driven, using TanStack Query. SSG/ISR are
  deliberately not used.
- Each route directory under `app/(app)/` is code-split automatically — a customer
  account never downloads admin verticals (the Angular app shipped almost everything in
  one bundle).

## State management

Hard boundary, enforced in review:

| Kind             | Where          | Examples                                           |
| ---------------- | -------------- | -------------------------------------------------- |
| **Server state** | TanStack Query | every API entity: jobs, plans, customers, reviews… |
| **Client state** | Zustand        | session token/user, sidebar, dialogs, preferences  |

- Query defaults (`src/shared/lib/query-client.ts`): `staleTime: 60s` (reference-data
  policy; operational screens override to `0`), retry 2× on 5xx/network only.
- Logout clears both worlds: `clearSession()` empties the store **and** calls
  `queryClient.clear()` — the equivalent of the Angular `StoreService.reset()`.
- Query-key factories per feature (`<entity>Keys.list(filter)`, `.detail(id)`) drive
  cache invalidation from mutations; no manual event streams.

## API layer

`src/shared/services/api/` wraps **ky**:

- `Accept: application/json` + `Authorization: Token <key>` on every own-API request.
- A 401 from our API (except the login endpoint itself) expires the session — ported
  verbatim from the Angular `ApiInterceptor`, including its edge-case rules.
- Every failure is normalized to `ApiError` (status + DRF field errors); components
  never see ky/fetch internals. `applyApiFieldErrors` maps DRF `{field: ["msg"]}`
  responses onto React Hook Form.
- `AbortSignal` is threaded through so TanStack Query cancels abandoned requests.
- Feature modules call versioned endpoints explicitly (`{apiHost}/v1/...`) — the backend
  v0/v1/v2 split is left untouched by the migration.
- **Responses are validated with Zod at the boundary** (`sessionSchema.parse(...)`), so
  backend shape drift fails loudly at fetch time rather than silently at render time.

## Authentication

Mirrors the Angular app exactly (parity first, hardening second):

1. `POST {authUrl}/login/` → `{ key, user }` (DRF token).
2. Session persists in localStorage via the Zustand `persist` middleware
   (`src/stores/session-store.ts`).
3. `RequireAuth` (in `app/(app)/layout.tsx`) waits for hydration, then redirects
   logged-out users to `/login`.
4. Post-login landing is role-based (`initialRouteForRole`), identical to
   `SessionService._openInitialPage`: field reps → `/itinerary`; operations, account
   managers, supervisors, customer accounts → `/review`; everyone else → `/dashboard`.
5. Sidebar contents come from the ported role→pages registry
   (`src/shared/constants/pages.ts`), filtered by env feature flags.
6. Expired tokens (401) trigger a single "session expired" toast and a clean logout.

**Planned hardening (requires backend):** httpOnly cookie sessions, at which point
`src/proxy.ts` (currently a documented no-op) performs the auth check at the edge and
localStorage persistence is deleted. Client guards are UX; the API stays the
authorization enforcement point either way.

## UI system

- **Tailwind CSS** design tokens + **shadcn/ui** (Radix) primitives in
  `src/shared/components/ui/` — accessible dialogs/menus/forms by default.
- Shared composites (`EmptyState`, `ErrorState`, `LoadingState`, `PageHeader`) keep
  loading/empty/error presentation consistent across features.
- Toasts via **sonner** (`AppProviders` mounts one `<Toaster>`).
- Forms: **React Hook Form + Zod** via `zodResolver`; field-level errors use the shadcn
  `Field` primitives with `aria-invalid` wiring.

## Error handling

- HTTP: normalized `ApiError` (see API layer).
- Rendering: route-group error boundary (`app/(app)/error.tsx`) renders `ErrorState`
  with a reset action; feature screens can add finer-grained boundaries as needed.
- Config: Zod-validated env fails at boot, not at first use.

## Compatibility contract with the Angular app

- Same backend, same endpoints, same token scheme — a user can switch apps freely.
- Route ids are identical, so bookmarks and deep links survive cutover.
- Role behavior (landing pages, sidebar catalogs, feature flags) is ported 1:1; any
  intentional divergence must be listed in MIGRATION_PLAN.md.
