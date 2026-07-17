# Tech Stack

Rule applied throughout: a dependency earns its place by replacing code we'd otherwise
maintain by hand or by removing a class of bugs. The comparative analysis against the
Angular app lives in `../club-powerhouse-web/TECH_STACK_DECISIONS.md`.

## Core

| Technology               | Role                               | Why                                                                                                                                                                                   |
| ------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Next.js (App Router)** | Framework, routing, code splitting | Route-per-directory maps 1:1 to the Angular route table; automatic per-route splitting fixes the old app's single-bundle problem; server runtime ready for edge auth (`src/proxy.ts`) |
| **React**                | UI                                 | Ecosystem below                                                                                                                                                                       |
| **TypeScript (strict)**  | Type safety                        | The Angular app accumulated 155 `: any`; strict mode + `no-explicit-any` lint keeps this codebase honest                                                                              |

## State

| Technology         | Role                            | Why                                                                                                                                                                                       |
| ------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TanStack Query** | ALL server state                | Replaces the Angular app's hand-rolled 13-entity cache (`StoreService`/model sets): caching, dedup, invalidation, retries, cancellation, focus refetch — deleted code, not rewritten code |
| **Zustand**        | Client state only (session, UI) | ~1 KB, no boilerplate; `persist` middleware replaces manual localStorage session code. Server data in a store is a review-blocking violation                                              |

## HTTP & validation

| Technology                 | Role               | Why                                                                                                                                                                                                                                                                            |
| -------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ky** (chosen over axios) | HTTP client        | Fetch-based → native `AbortSignal` (what TanStack Query hands us) and edge-runtime compatible; `beforeRequest`/`afterResponse` hooks cover the old interceptor in ~30 lines; ~4 KB vs ~35 KB. Swapping to axios would touch exactly one file (`shared/services/api/client.ts`) |
| **Zod**                    | Runtime validation | One schema per entity: validates API responses at the boundary, powers form validation, and infers the TS types — three jobs, one source of truth                                                                                                                              |

## UI

| Technology                                | Role                 | Why                                                                                                                               |
| ----------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Tailwind CSS**                          | Styling              | Already the team's system in the Angular app; here it's the _only_ one (no Material/Tailwind split)                               |
| **shadcn/ui** (Radix primitives)          | Component primitives | Source-owned, Tailwind-styled; Radix supplies focus trapping/keyboard/aria for dialogs & menus that the old custom widgets lacked |
| **sonner**                                | Toasts               | Replaces `SnackBarService`/MatSnackBar                                                                                            |
| **React Hook Form + @hookform/resolvers** | Forms                | Uncontrolled/performant; first-class Zod integration; DRF field errors map on via `applyApiFieldErrors`                           |
| **date-fns**                              | Dates                | Replaces moment (maintenance mode, non-tree-shakeable)                                                                            |
| **@hugeicons/react**                      | Icons                | Ships with the shadcn preset; one icon system                                                                                     |

## Quality & DX

| Technology                                                                                                   | Role                                        |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| **ESLint** (next/core-web-vitals, typescript-eslint, @tanstack/query) + `no-explicit-any`, `react/no-danger` | Correctness + architecture rules            |
| **Prettier** (+ tailwind class sorting)                                                                      | Formatting off code review's plate          |
| **Husky + lint-staged**                                                                                      | Pre-commit lint/format on staged files only |

## Planned (added with the vertical that needs them — not before)

- **TanStack Table** — jobs/itinerary/archives tables (vertical #2–3)
- **Recharts** — dashboard charts (vertical #1); replaces ngx-charts + d3 v4
- **jspdf / jszip / papaparse** — kept from the Angular app (framework-agnostic), loaded
  via `next/dynamic` (verticals #3, #8)
- **Vitest + React Testing Library, Playwright, MSW** — testing stack; E2E specs are
  written against the Angular app first (see migration plan)

## Deliberately not adopted

Redux/RTK (ceremony without benefit given Query+Zustand), NextAuth (bespoke DRF token
auth — abstraction without removed code), tRPC/GraphQL (existing REST backend),
styled-components (second styling runtime), i18n framework (single-language app),
virtualization/infinite-scroll libs (add only where a screen measurably needs them).
