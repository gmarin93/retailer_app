import {
  Archive02Icon,
  Briefcase01Icon,
  Building01Icon,
  Calendar03Icon,
  Cash01Icon,
  CheckListIcon,
  DashboardSquare01Icon,
  EyeIcon,
  FlashIcon,
  ImageCompositionIcon,
  Invoice01Icon,
  Layers01Icon,
  MagicWand01Icon,
  PuzzleIcon,
  Radar01Icon,
  ReceiptTextIcon,
  Settings01Icon,
  ShoppingBag01Icon,
  Store01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { UserRole } from "@/features/auth/types";
import { env } from "@/shared/lib/env";

/**
 * Sidebar navigation registry, ported from the Angular `page/pages.ts` and
 * `page/pages-per-role.ts`. Route ids are kept verbatim so deep links keep
 * working when traffic moves from the Angular app to this one.
 */
export interface Page {
  /** Route id — the page renders at `/<id>`. */
  id: string;
  title: string;
  icon: IconSvgElement;
}

export const PAGE_MAP = {
  dashboard: { id: "dashboard", title: "Dashboard", icon: DashboardSquare01Icon },
  command_center: { id: "command_center", title: "Command Center", icon: Radar01Icon },
  operations: { id: "operations", title: "Operations", icon: PuzzleIcon },
  plan: { id: "plan", title: "Planning", icon: MagicWand01Icon },
  showcase: { id: "showcase", title: "Proof of Execution", icon: ImageCompositionIcon },
  review: { id: "review", title: "Review", icon: CheckListIcon },
  speed_review: { id: "speed-review", title: "Speed Review", icon: FlashIcon },
  itinerary: { id: "itinerary", title: "Itinerary", icon: Briefcase01Icon },
  archives: { id: "archives", title: "Archives", icon: Archive02Icon },
  user_invoicing: { id: "user_invoicing", title: "Rep Invoicing", icon: Cash01Icon },
  customer_invoicing: {
    id: "customer_invoicing",
    title: "Customer Invoicing",
    icon: Invoice01Icon,
  },
  customer_invoices: {
    id: "customer_invoices",
    title: "Customer Invoices",
    icon: ReceiptTextIcon,
  },
  customer_invoices_for_customer: {
    id: "customer_invoices",
    title: "Invoices",
    icon: ReceiptTextIcon,
  },
  users: { id: "users", title: "Users", icon: UserIcon },
  stores: { id: "stores", title: "Stores", icon: Store01Icon },
  programs: { id: "programs", title: "Programs", icon: Layers01Icon },
  customers: { id: "customers", title: "Customers", icon: Building01Icon },
  retailers: { id: "retailers", title: "Retailers", icon: ShoppingBag01Icon },
  cycles: { id: "cycles", title: "Cycles", icon: Calendar03Icon },
  customerVisits: { id: "customer_visits", title: "Customer Visits", icon: EyeIcon },
  settings: { id: "settings", title: "Settings", icon: Settings01Icon },
} satisfies Record<string, Page>;

/**
 * Alias entries reuse another entry's route for a different role, so they are
 * excluded from the de-duplicated admin catalog.
 */
const ALIAS_PAGE_KEYS = new Set<keyof typeof PAGE_MAP>(["customer_invoices_for_customer"]);

export const ALL_PAGES: Page[] = Object.entries(PAGE_MAP)
  .filter(([key]) => !ALIAS_PAGE_KEYS.has(key as keyof typeof PAGE_MAP))
  .map(([, page]) => page);

/** Sidebar pages per role, ported verbatim from `pages-per-role.ts`. */
const ROLE_PAGES_MAP: Partial<Record<UserRole, Page[]>> = {
  [UserRole.SYS_ADMIN]: ALL_PAGES,
  [UserRole.OPERATIONS]: [
    PAGE_MAP.dashboard,
    PAGE_MAP.command_center,
    PAGE_MAP.operations,
    PAGE_MAP.plan,
    PAGE_MAP.review,
    PAGE_MAP.speed_review,
    PAGE_MAP.user_invoicing,
    PAGE_MAP.customer_invoicing,
    PAGE_MAP.customer_invoices,
    PAGE_MAP.users,
    PAGE_MAP.stores,
    PAGE_MAP.programs,
    PAGE_MAP.customers,
    PAGE_MAP.retailers,
    PAGE_MAP.cycles,
    PAGE_MAP.customerVisits,
  ],
  [UserRole.FINANCES]: [
    PAGE_MAP.dashboard,
    PAGE_MAP.review,
    PAGE_MAP.speed_review,
    PAGE_MAP.user_invoicing,
    PAGE_MAP.customer_invoicing,
    PAGE_MAP.customer_invoices,
    PAGE_MAP.users,
    PAGE_MAP.stores,
    PAGE_MAP.programs,
    PAGE_MAP.customers,
    PAGE_MAP.retailers,
    PAGE_MAP.cycles,
  ],
  [UserRole.ACCOUNT_MANAGER]: [
    PAGE_MAP.dashboard,
    PAGE_MAP.command_center,
    PAGE_MAP.plan,
    PAGE_MAP.review,
    PAGE_MAP.speed_review,
  ],
  [UserRole.FIELD_SUPERVISOR]: [
    PAGE_MAP.dashboard,
    PAGE_MAP.command_center,
    PAGE_MAP.review,
    PAGE_MAP.speed_review,
    PAGE_MAP.itinerary,
    PAGE_MAP.archives,
  ],
  [UserRole.SR_FIELD_SUPERVISOR]: [
    PAGE_MAP.dashboard,
    PAGE_MAP.command_center,
    PAGE_MAP.review,
    PAGE_MAP.speed_review,
    PAGE_MAP.itinerary,
    PAGE_MAP.archives,
  ],
  [UserRole.FIELD_REP]: [PAGE_MAP.dashboard, PAGE_MAP.itinerary, PAGE_MAP.archives],
  [UserRole.CUSTOMER_ACCOUNT]: [
    PAGE_MAP.dashboard,
    PAGE_MAP.showcase,
    PAGE_MAP.review,
    PAGE_MAP.speed_review,
    PAGE_MAP.customer_invoices_for_customer,
  ],
  [UserRole.RETAILER_ACCOUNT]: [PAGE_MAP.dashboard],
};

/** Maps route ids to the feature flag that gates them (env-controlled). */
const PAGE_FEATURE_FLAGS: Record<string, boolean> = {
  command_center: env.featureFlags.commandCenter,
  showcase: env.featureFlags.proofOfExecution,
};

export function isPageEnabled(pageId: string): boolean {
  return PAGE_FEATURE_FLAGS[pageId] ?? true;
}

/** Sidebar pages for a role, with feature-flagged pages filtered out. */
export function getPagesForRole(role: UserRole): Page[] {
  return (ROLE_PAGES_MAP[role] ?? []).filter((page) => isPageEnabled(page.id));
}

/** True when the given route id exists in the page registry. */
export function isKnownPage(pageId: string): boolean {
  return ALL_PAGES.some((page) => page.id === pageId);
}
