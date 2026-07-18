# Security roles (web React)

The Django API owns authorization. This Next.js app uses `UserRole` for **route/nav/UI gates** and client-side affordances only. Never treat a hidden button as security — the API must still reject unauthorized writes.

Canonical helpers: `src/features/auth/permissions.ts` and feature `permissions.ts` files (e.g. `src/features/jobs/permissions.ts`). Prefer those predicates over ad-hoc role string compares.

## Roles (`UserRole` in `src/features/auth/types`)

| Constant | Value | Typical web surfaces |
| --- | --- | --- |
| `DEMO_USER` | `demo_user` | Restricted |
| `SYS_ADMIN` | `sys_admin` | Elevated ops / dashboard |
| `OPERATIONS` | `operations` | Elevated ops / dashboard |
| `FINANCES` | `finances` | Elevated (invoicing, etc.) |
| `ACCOUNT_MANAGER` | `account_manager` | Managed accounts, review, bulk extend/reassign |
| `FIELD_SUPERVISOR` | `field_supervisor` | Review / supervised work |
| `SR_FIELD_SUPERVISOR` | `sr_field_supervisor` | Same family as field supervisor |
| `FIELD_REP` | `field_rep` | Assigned jobs / itinerary |
| `CUSTOMER_ACCOUNT` | `customer_account` | Customer dashboards, released jobs/photos |
| `RETAILER_ACCOUNT` | `retailer_account` | Retailer-scoped |

## Role groups (keep in sync with API)

- **Elevated**: `sys_admin` | `operations` | `finances` → `isElevated`
- **Elevated or manager**: + `account_manager` → `isElevatedOrManager`
- **Elevated / manager / supervisor**: + supervisors → `isElevatedOrManagerOrSupervisor`

Nav pages come from `getPagesForRole(role)` in the app shell — update that when adding role-gated routes.

## Client rules

1. **Server is authoritative** — list/detail data is already role-scoped by the API. Do not invent client-side “show everything then filter” for sensitive entities.
2. **Fail closed** — unknown roles get the least privilege (no elevated menus).
3. **Use `UserRole` enum** — never raw role strings in new code.
4. **Tokens** — DRF token auth via session store; do not log tokens or put them in URL query params.
5. **`NEXT_PUBLIC_*` is public** — anything in env that starts with `NEXT_PUBLIC_` ships to the browser. Never put secrets there.
6. When porting Angular `PermissionsService` behavior, extend `permissions.ts` helpers and add tests rather than duplicating checks in components.

## When changing role logic

1. Update `src/features/auth/permissions.ts` (and feature-level helpers) first.
2. Mirror any API scoping change with the `club-powerhouse-api` repo when contracts depend on it.
3. Cover positive + negative role gates in unit or Playwright e2e tests (`e2e/`).
