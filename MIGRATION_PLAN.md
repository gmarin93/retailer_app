# Migration Plan

Feature-by-feature roadmap for moving the Powerhouse frontend from the Angular app
(`../club-powerhouse-web`) to this project. The Angular app stays in production until
every vertical is verified here. The complete strategy (risks, rollback, timeline,
technical-debt analysis) lives in the Angular repo's `FRONTEND_MIGRATION_PLAN.md`; this
file tracks execution from the new app's side.

## Principles

1. **Parity before improvement** — port behavior 1:1; redesign after cutover.
2. **Analyze before porting** — read the Angular component/bloc/model-set for a vertical
   before writing its React twin; undocumented behavior lives there.
3. **Same API, same routes** — endpoints untouched; route ids identical so deep links
   survive.
4. **Each vertical is verifiable** — E2E specs (Playwright, tracked in the Angular repo
   plan) plus a stakeholder walkthrough on staging gate every vertical.

## Status

### ✅ Phase 0 — Foundation (this scaffold)

- Next.js App Router, TS strict, Tailwind, shadcn/ui, ESLint/Prettier/Husky/lint-staged
- Zod-validated env config; feature flags (`command_center`, `showcase`)
- API layer (ky): auth header, 401→logout parity, error normalization, cancellation
- Auth: DRF token login, persisted session, role landing pages, expiry handling
- App shell: role-aware sidebar (ported `pages-per-role.ts`), user menu, mobile drawer
- Shared UI: Empty/Error/Loading states, PageHeader, form field primitives
- Placeholder route (`[slug]`) so every sidebar link works during migration

### 🚧 Vertical 1 — Dashboard (in progress)

Done (supervisor/operations dashboard, `features/dashboard/`):

- Stat cards (team / clients / complete / pending) via `dashboard/stats/` with the
  list-endpoint count fallback; click-through to `/review?status=…`
- Fill-rate chart (Recharts): by-client / by-month views, cycle multi-select with the
  12-recent default + "More options" (Note 149), year filter, client multi-select,
  legend series toggling (Note 172), bar drill-down to `/review`
- Total hours by clients: status tabs, aggregated endpoint with the chart-derived
  fallback when it 404s, view-all dialog
- Visits pending review by client: aggregated endpoint (single cycle) with the
  reviewable-jobs aggregation fallback, drill-down + view-all dialog
- Plan documents card: current-cycle preview → all-cycles fallback, view-all dialog
- Shared reference-data hooks: `shared/services/entities/{cycles,customers}.ts`
  (fetch-all pagination, current-cycle resolution ported from `utils/cycles.ts`)

Also done — **customer-portal dashboard** (`customer-dashboard.tsx` + `customer-{api,hooks}.ts`,
ported from `dashboard-customer.component.ts`):

- Informational stat cards (team members / clients)
- "Complete hours by month" chart: single client (defaults to first assigned) + year
  filter, completed+invoiced statuses, year-bounded fill-rate query grouped by month
- Total hours by client across all assigned clients for the year
- Plan documents scoped to the selected client (preview + view-all dialog)
- Calendar (Notes 168/151/173): month grid with per-day dots for complete/pending
  reviews and reminders; completed counts from `dashboard/calendar/` with the
  reviewable-jobs fallback; pending counts always recomputed from submitted visits
  (UTC visit-date bucketing ported from `calendarBucketKey`); selected-day panel;
  brand-scoped "Add reminder" flow incl. the keep-locally-on-failure behavior

Also done:

- **Plan-documents direct fallback** (`fetchPlanDocumentsDirect`): when the aggregated
  endpoint is missing/empty, documents are resolved straight from plans — list plans
  (cycle/customer scoped), fan out to details for plans with `num_documents > 0` at
  concurrency 5, dedupe by title; supervisor preview uses the random-sample rotation
- **Reminder notification bell** (`reminder-bell.tsx`, customer accounts only): badge
  with due/undismissed count, 60 s polling while mounted, optimistic per-item and
  dismiss-all, wired into the app-shell header; creating a reminder refreshes the bell

Remaining before the vertical is done:

- [ ] Verify against the live API per role; E2E specs; stakeholder walkthrough

### 🚧 Vertical 2 — Itinerary (core done)

Done (`features/itinerary/` + shared `features/jobs/`):

- **Shared jobs core** (reused by Review/Archives later): job schemas (listable +
  detailed with photo/question requests, reports, documents), status labels, the
  `JobOrdering` sort→`_order` mapping, `isJobOverdue`, the itinerary priority sort,
  paged list + detail query hooks
- **Visits list**: search, server-side sortable columns (BASIC column set), pagination
  (20/100/500), refresh; priority sort Overdue → WIP → Submitted → Others applied unless
  the user sorts by status (ported from `ItineraryMasterBloc.refreshJobs`)
- **Master/detail coordination**: open/close, prev/next with wrap-around, deep link
  `?job=<id>` (filters to the visit and auto-opens, as the command palette expects)
- **Visit detail**: header + meta tiles (store/program/cycle/dates/planned time),
  documents / questions / photos sections (read-only responses; photo click opens the
  original), account-manager mailto with the exact subject format, geolocation save
  (store PATCH) + the one-time-per-visit feature toast (localStorage-gated)
- **Report submission**: requirements gating (`canWorkJob`/required photo+question
  responses), hours/minutes/date dialog with over/under-planned warnings, on-behalf
  assignee selector for elevated roles, optimistic cache update (status → pending)
- Shared `features/auth/permissions.ts` role-group predicates ported from
  `PermissionsService`

Remaining before the vertical is done:

- [ ] Verify against the live API per role; E2E specs; stakeholder walkthrough

(Advanced filters shipped later with Jobs polish — see below.)

### ✅ Vertical 3 — Jobs (done)

Done (`features/jobs/`, wired into the itinerary detail):

- **Photo responses** (`job-photos-list.tsx`, ported from the 357-line Angular
  component): per-request upload with the mobile-app logic — multiple files via the
  batch `photosVisit/` endpoint with per-photo fallback on 404/405, single file via
  `photo/`; 3-photo cap; delete via `xphoto/` with confirmation; review status
  ("Awaiting review" / "Accepted" / "Action required") + feedback shown to
  elevated…rep roles; uploads by non-assignees attributed to the first assignee
- **Question responses** (`job-questions-list.tsx` + kind-aware responder dialog):
  answer via `question/`, edit via `PATCH question_responses/{id}/`, delete via
  `xquestion/` with confirmation; all five kinds (text, yes/no, checklist,
  multiple choice, number with min/max)
- **Photo upload dialog**: up to 3 photos, file picker + drag-and-drop, previews
- Shared `ConfirmDialog` (the Angular `ChoiceDialogComponent` twin) and a multipart
  `apiPostForm` helper on the API client
- Cache semantics ported: endpoints return the request's response list, which is
  written straight into the cached job detail (no full refetch), except the batch
  upload which refetches (its response has no photo responses)
- Job permission helpers moved to `features/jobs/permissions.ts` (itinerary
  re-exports them), keeping the feature dependency direction jobs ← itinerary
- Bulk toolbar, edit dialog, photo ZIP, server report email/blob, role-based columns
  (see Jobs polish below). Note: Angular never used client jspdf for jobs reports.

Remaining: live-API verification / E2E.

### ✅ Vertical 4 — Review (done)

Done (`features/review/`, route `/review`):

- **Master list** on `jobs/reviewable/` with the base-bloc default ordering
  (status desc → due asc → start asc), search, server-side sort, pagination
- **Drill-down query params** ported from `ReviewMasterComponent`: `?job=` (auto-opens
  the visit), `?status/assignee/customer/program/cycle=` — what the dashboard stat
  cards, chart bars, and pending-reviews rows navigate with; "Clear filters" drops them
- **Review detail**: status actions (Mark as WIP / Mark as reviewed with the full
  Angular gate — open/pending only, requirements filled, all photos rated, planned vs
  actual time match unless the status code bypasses it), photos + questions columns
  (photos in review mode), visit-info sidebar with assignees/status code/cancel reason
  (role-gated), reports list, documents, prev/next navigation, role-aware email
  (customers → account managers, others → assignees)
- **Photo review**: accept / reject (toggle back to pending) + feedback via
  `photo_responses/{id}/set_status|set_feedback/`, wired into `JobPhotosList`
  review mode for elevated/manager/supervisor roles
- **Gallery overlay**: thumbnails, prev/next + keyboard, accept/reject/feedback,
  download, email, visit star rating (`POST jobs/{id}/review/`)
- **Action dialogs** (single visit, calling the bulk `jobs/{action}/` endpoints):
  Change visit (dates + planned time), Reassign (rep picker from `users?rep_no__gte=0`),
  Cancel (cancel-code status codes + reason), Reinstate (confirm),
  Return to itinerary (unelevated status codes + reason + copy-me),
  Issue email update (message + copy-me)
- **Report submit / edit / delete** (elevated|manager|supervisor): `POST jobs/{id}/report/`,
  `PATCH/DELETE job_reports/{id}/` — reuses itinerary `ReportDialog`

Also done:

- **Speed Review** (`features/speed-review/`, route `/speed-review`): keyboard triage
  queue for pending reviewable visits, photo accept/reject/feedback, mark reviewed,
  cycle/customer query filters

Remaining before the vertical is done:

- [ ] Verify against the live API per role; E2E specs; stakeholder walkthrough

### ✅ Vertical 5 — Archives (core done)

Done (`features/archives/`, route `/archives`):

- Master list on `jobs/archived/` with base-bloc default ordering, search,
  server-side sort, pagination, `?job=` deep link, prev/next in detail
- Read-only visit detail: meta card, email to account managers, submitted report,
  documents / questions / photos (the shared lists hide their actions because
  `canWorkJob` is false for completed/cancelled/invoiced visits)
- Reuses the shared jobs core end to end — the vertical is ~350 lines of new code

Remaining: live-API verification / E2E (photo ZIP + advanced filters shared with Jobs polish).

### ✅ Vertical 6 — Planning / Showcase (editor Phase A+B done)

Done:

- **Showcase** (`features/showcase/`, route `/showcase`, feature-flagged): full port of
  the 420-line `showcase.component.ts` — brand/program/cycle selectors (reviewable
  scopes for portal users, defaults to first brand + current cycle), execution-rate hero
  metrics, per-store photo grid joined from `jobs/reviewable/` + the `photos_report`
  endpoint with the exact aggregation/sort, "only stores with photos" toggle, and a
  keyboard-navigable lightbox (arrows + escape)
- **Planning Studio** (`features/planning/`, route `/plan`, `/planning_studio`
  redirects): cycle → customer → program → groups, readiness, create/edit form (Plans /
  Stores / Visits / Photos / Questions / Documents with multipart upload), dirty-field
  save (`PATCH /v1/plans/`), lifecycle Complete / Verify / Unverify / Delete, allocate
  preview (`dry_run` KPIs + rep workload + job matrix) + allocate-with-warnings confirm,
  copy dialog (`store_diff` + prior-cycle stores + visit sync), planning charts
  (hours/budget pies via `POST /v2/plans/chart/`), plans summary download
  (`GET /v2/plans/summary_report/`), `?plan=` deep link

Also done (final planner polish):

- Photo/question/document **template library** (click-to-add + ↑/↓ reorder; custom
  photo/question types in `planner.*.custom` localStorage — same keys as Angular)
- **Set budget** dialog from charts card →
  `POST /v2/customers/reviewable/{id}/set_cycle_budget/`

Remaining:

- [ ] Live-API verification / E2E specs

### ✅ Vertical 7 — Entity management + Settings + Customer Visits

Done:

- Config-driven CRUD for users / stores / programs / customers / retailers / cycles
- Settings (announcements + mobile app versions)
- **Customer Visits Access** (`features/customer-visits/`, `/customer_visits`):
  grant / lookup / revoke Owner|Manager|Supervisor via v2 match endpoints
- **Store extras**: avatar upload in edit dialog (`PATCH /v2/stores/{id}/` + `avatar`),
  Assign reps row action → `set_user_priorities`, bulk logo upload for stores /
  customers / retailers (manual entity pairing, concurrency 3), required retailer FK +
  phone/email, inline Active toggle
- **Program extras**: required customer + retailer FKs (v0 hyperlink URLs)

Remaining: live-API verification. CSV import + store XLS export are dead/unwired in
Angular production UI — intentionally not ported.

### ✅ Vertical 8 — Invoicing (core done)

Done ahead of the original “late” slot: rep invoicing (`/user_invoicing`), customer
invoice list + studio (`/customer_invoices*`, `/customer_invoicing`). Budget dialog
lives on Planning Studio (`set-budget-dialog`) at API parity. Remaining: live-API
verification / E2E.

### ✅ Vertical 9 — Command Center + Command Palette

Done:

- **Command Center** (`features/command-center/`, `/command_center`, flag-gated):
  cycle/client/program scope, health + 6 KPIs, three action queues, pending-by-client
  backlog; Review drill-through supports `overdue` / `unassigned` query params
- **Command Palette** (⌘/Ctrl+K + header Search): pages, logout, recents, role-gated
  entity search (jobs/plans/stores/users/customers/retailers/programs/cycles)

### ✅ Vertical 10 — AI assistant (Klikin, v1)

Done when `NEXT_PUBLIC_ASSISTANT_HOST` is set: FAB + drawer, chat + history,
`confirm_action` cards, `navigate` / `set_filter` actions, attachments, suggestion
chips. Deferred: report wizard, full AgentBridge / per-page `operate_page` controllers.

### ✅ Operations (itinerary publish)

Done (`features/operations/`, `/operations`): cycle/province/reps report, week
overload cells, select-to-publish → `POST jobs/publish/`, per-rep detail with
reassign + bulk **Edit** (`JobsEditDialog`).

### Jobs polish + E2E (done this pass)

- Advanced filter sheet + overdue/unassigned quick pills (itinerary/review/archives)
- Bulk selection toolbar: edit / extend / reassign / cancel / reinstate
- Photo ZIP download (JSZip) + server report email/blob dialog
- Role-based jobs table columns (BASIC / ELEVATED / CUSTOMER); archives hide status
- Playwright scaffold (`e2e/`, `npm run test:e2e`); auth specs need `E2E_EMAIL`/`E2E_PASSWORD`

### Remaining

| Item | Notes |
| --- | --- |
| Live-API / stakeholder verification | Per-vertical DoD walkthroughs |
| Full Playwright suite | Expand beyond smoke once staging credentials are wired (`E2E_EMAIL` / `E2E_PASSWORD`) |
| Optional polish | Klikin report wizard / AgentBridge — only if `NEXT_PUBLIC_ASSISTANT_HOST` is in cutover |
| **UI/UX parity** | Foundation pass done (brand tokens, Roboto, shell, primitives, login). Per-screen polish continues against Angular |

Skipped intentionally: CSV import, store XLS export (dead/unwired in Angular UI); client
jspdf jobs PDFs (never used — server blob/email only).

### UI/UX parity (in progress)

Foundation (Angular visual source of truth):

- Brand tokens `#4c6fff` / page `#f4f6fb` / soft `#eaeffe` in `globals.css`
- Roboto typeface; logo asset at `public/brand/logo.png`
- App shell: 64px toolbar, collapsible 240↔90 sidenav, active gradient pills
- Shared primitives: pill buttons (36px), outlined inputs/selects, 16px dialogs,
  table header `#eef3ff`, card shadow language, top-center toasts
- Login split brand panel; job status chip colors

Next screens to polish against Angular: Dashboard → Review → Itinerary → Planning → Entities.

## Feature migration order

Ordered by dependency and business value: dashboard first (every role lands near it and
it exercises the whole data layer), invoicing late (most complex interactive UI), flagged
features last (currently off in production).

| #   | Vertical                                                                                | Angular sources                                           | Complexity | Rationale                                                           |
| --- | --------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| 1   | **Dashboard** (admin/customer/operations + 3 dialogs, fill-rate chart)                  | `components/dashboard*`, `chart-fill-rate`                | M          | High visibility; establishes query-hook, chart, and dialog patterns |
| 2   | **Itinerary** (master/detail, geolocation)                                              | `blocs/itinerary-*`, `components/itinerary*`              | M/H        | Field-rep landing page; proves the master/detail hook pattern       |
| 3   | **Jobs** (photos/questions/documents, 7 dialogs, batch upload, zip worker, PDF reports) | `blocs/job-*`, `components/job*`, `workers/`              | **H**      | Core of the product; largest vertical — budget slack here           |
| 4   | **Review + Speed Review**                                                               | `blocs/review-*`, `components/review*`                    | M          | Landing page for 5 roles; depends on jobs patterns                  |
| 5   | **Archives**                                                                            | `blocs/archives-*`, `jobs-download`                       | M          | Reuses jobs/review components                                       |
| 6   | **Planning / Planning Studio / Showcase**                                               | `components/plan*`, `showcase`                            | M/H        | Showcase is feature-flagged (customer portal)                       |
| 7   | **Entity management + Settings**                                                        | `features/entity-management`, `features/settings`         | M          | CRUD screens; exercises forms + DataTable heavily                   |
| 8   | **Invoicing** (rep + customer: list, builder, studio, budget dialog)                    | `features/invoicing`, `customer-invoice-*`                | **H**      | Most complex interactive UI; deliberately late                      |
| 9   | **Command Center + command palette**                                                    | `components/command-center`, `command-palette`            | M          | Feature-flagged off in prod; low cutover risk                       |
| 10  | **AI assistant (Klikin chat)**                                                          | `components/klikin-chat`, `services/klikin-ai.service.ts` | S/M        | Separate FastAPI backend (`NEXT_PUBLIC_ASSISTANT_HOST`)             |

### Per-vertical definition of done

- [ ] Angular implementation reviewed (components, bloc, model sets it touches)
- [ ] Zod schemas parse real API fixtures for its entities
- [ ] Query/mutation hooks with key-factory invalidation
- [ ] UI at behavior parity (tracked divergences only)
- [ ] Placeholder `[slug]` route replaced by a real route directory
- [ ] E2E specs green; stakeholder walkthrough on staging signed off; no open P1s

## After all verticals

1. Full-suite validation + 1–2 weeks of parallel real-user use on staging.
2. Performance pass (bundle budget, `next/dynamic` for jspdf/jszip/charts, `next/image`).
3. Cutover: point the production domain here; keep Angular deployable one business cycle.
4. Auth hardening (httpOnly cookies via `src/proxy.ts`) — scheduled with backend capacity.
