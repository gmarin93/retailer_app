import { env } from "@/shared/lib/env";
import { api } from "@/shared/services/api";
import { z } from "zod";
import type { PaletteItem } from "./types";

const v2 = `${env.apiHost}/v2`;
const PAGE_SIZE = 6;
/** Plans list serializers are heavy; allow longer than the default 30s client timeout. */
const PALETTE_TIMEOUT_MS = 60_000;

const bareTitledSchema = z.looseObject({
  id: z.coerce.number().optional(),
  title: z.string().catch(""),
  code: z.string().nullish(),
});

const titledSchema = z.looseObject({
  id: z.coerce.number(),
  title: z.string().catch(""),
  code: z.string().nullish(),
  username: z.string().nullish(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  store_no: z.union([z.string(), z.number()]).nullish(),
});

/** Plan list rows use `group` as the display name (Angular command palette). */
const planSearchSchema = z.looseObject({
  id: z.coerce.number(),
  group: z.string().catch(""),
  program: bareTitledSchema.nullish(),
  cycle: bareTitledSchema.nullish(),
});

const jobSearchSchema = z.looseObject({
  id: z.coerce.number(),
  title: z.string().catch(""),
  status: z.string().catch(""),
  customer: bareTitledSchema.nullish(),
  store: bareTitledSchema.nullish(),
  plan: z.looseObject({ group: z.string().nullish() }).nullish(),
  group: z.string().nullish(),
});

/**
 * Lenient page parse: ignore pagination metadata shape drift and drop rows that
 * fail item validation instead of failing the whole palette section.
 */
function parseResultRows<T>(data: unknown, itemSchema: z.ZodType<T>): T[] {
  const page = z
    .looseObject({
      results: z.array(z.unknown()).catch([]),
    })
    .safeParse(data);
  if (!page.success) return [];
  const rows: T[] = [];
  for (const row of page.data.results) {
    const parsed = itemSchema.safeParse(row);
    if (parsed.success) rows.push(parsed.data);
  }
  return rows;
}

async function searchEntity(
  route: string,
  query: string,
  signal?: AbortSignal,
): Promise<z.infer<typeof titledSchema>[]> {
  const data = await api.get<unknown>(`${v2}/${route}/`, {
    searchParams: {
      _search: query,
      _page: 1,
      _page_size: PAGE_SIZE,
    },
    signal,
    timeout: PALETTE_TIMEOUT_MS,
  });
  return parseResultRows(data, titledSchema);
}

function jobTitle(row: z.infer<typeof jobSearchSchema>): string {
  const planGroup = row.plan?.group?.trim() || row.group?.trim();
  if (planGroup) return planGroup;
  const storeName = row.store?.title?.trim();
  if (storeName) return storeName;
  const customerName = row.customer?.title?.trim();
  if (customerName) return customerName;
  if (row.title.trim()) return row.title.trim();
  return `Visit #${row.id}`;
}

function jobSubtitle(row: z.infer<typeof jobSearchSchema>, title: string): string | undefined {
  const parts = [row.customer?.title, row.store?.title, row.status].filter(
    (part): part is string => Boolean(part && part !== title),
  );
  return parts.length > 0 ? parts.join(" • ") : undefined;
}

export async function searchPaletteJobs(
  query: string,
  reviewable: boolean,
  signal?: AbortSignal,
): Promise<PaletteItem[]> {
  const route = reviewable ? "jobs/reviewable" : "jobs";
  const data = await api.get<unknown>(`${v2}/${route}/`, {
    searchParams: {
      _search: query,
      _page: 1,
      _page_size: PAGE_SIZE,
    },
    signal,
    timeout: PALETTE_TIMEOUT_MS,
  });
  const rows = parseResultRows(data, jobSearchSchema);
  return rows.map((row) => {
    const title = jobTitle(row);
    return {
      id: `job-${row.id}`,
      group: "Jobs" as const,
      title,
      subtitle: jobSubtitle(row, title),
      href: reviewable ? `/review?job=${row.id}` : `/itinerary?job=${row.id}`,
    };
  });
}

export async function searchPalettePlans(
  query: string,
  signal?: AbortSignal,
): Promise<PaletteItem[]> {
  const data = await api.get<unknown>(`${v2}/plans/`, {
    searchParams: {
      _search: query,
      _page: 1,
      _page_size: PAGE_SIZE,
    },
    signal,
    timeout: PALETTE_TIMEOUT_MS,
  });
  const rows = parseResultRows(data, planSearchSchema);
  return rows.map((row) => ({
    id: `plan-${row.id}`,
    group: "Plans" as const,
    title: row.group || `Plan #${row.id}`,
    subtitle: [row.program?.title, row.cycle?.title].filter(Boolean).join(" • ") || undefined,
    href: `/plan?plan=${row.id}`,
  }));
}

function entityItems(
  group: PaletteItem["group"],
  routeId: string,
  rows: z.infer<typeof titledSchema>[],
  label: (row: z.infer<typeof titledSchema>) => string,
): PaletteItem[] {
  return rows.map((row) => {
    const text = label(row);
    return {
      id: `${group.toLowerCase()}-${row.id}`,
      group,
      title: text,
      href: `/${routeId}?q=${encodeURIComponent(text)}`,
    };
  });
}

export async function searchPaletteStores(
  query: string,
  signal?: AbortSignal,
): Promise<PaletteItem[]> {
  const rows = await searchEntity("stores", query, signal);
  return entityItems(
    "Stores",
    "stores",
    rows,
    (r) => r.title || r.code || (r.store_no != null ? String(r.store_no) : "") || `Store #${r.id}`,
  );
}

export async function searchPaletteUsers(
  query: string,
  signal?: AbortSignal,
): Promise<PaletteItem[]> {
  const rows = await searchEntity("users", query, signal);
  return entityItems("Reps", "users", rows, (r) => {
    const name = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
    return name || r.username || `User #${r.id}`;
  });
}

export async function searchPaletteCustomers(
  query: string,
  signal?: AbortSignal,
): Promise<PaletteItem[]> {
  const rows = await searchEntity("customers", query, signal);
  return entityItems("Customers", "customers", rows, (r) => r.title || r.code || `Customer #${r.id}`);
}

export async function searchPaletteRetailers(
  query: string,
  signal?: AbortSignal,
): Promise<PaletteItem[]> {
  const rows = await searchEntity("retailers", query, signal);
  return entityItems("Retailers", "retailers", rows, (r) => r.title || r.code || `Retailer #${r.id}`);
}

export async function searchPalettePrograms(
  query: string,
  signal?: AbortSignal,
): Promise<PaletteItem[]> {
  const rows = await searchEntity("programs", query, signal);
  return entityItems("Programs", "programs", rows, (r) => r.title || r.code || `Program #${r.id}`);
}

export async function searchPaletteCycles(
  query: string,
  signal?: AbortSignal,
): Promise<PaletteItem[]> {
  const rows = await searchEntity("cycles", query, signal);
  return entityItems("Cycles", "cycles", rows, (r) => r.title || r.code || `Cycle #${r.id}`);
}
