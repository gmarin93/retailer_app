import { env } from "@/shared/lib/env";
import { api } from "@/shared/services/api";
import { resultsPageSchema } from "@/shared/services/api/pagination";
import { z } from "zod";
import type { PaletteItem } from "./types";

const v2 = `${env.apiHost}/v2`;
const PAGE_SIZE = 6;

const titledSchema = z.looseObject({
  id: z.number(),
  title: z.string().catch(""),
  code: z.string().nullish(),
  username: z.string().nullish(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  store_no: z.union([z.string(), z.number()]).nullish(),
});

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
  });
  return resultsPageSchema(titledSchema).parse(data).results;
}

export async function searchPaletteJobs(
  query: string,
  reviewable: boolean,
  signal?: AbortSignal,
): Promise<PaletteItem[]> {
  const route = reviewable ? "jobs/reviewable" : "jobs";
  const rows = await searchEntity(route, query, signal);
  return rows.map((row) => ({
    id: `job-${row.id}`,
    group: "Jobs" as const,
    title: `Visit #${row.id}`,
    subtitle: row.title || undefined,
    href: reviewable ? `/review?job=${row.id}` : `/itinerary?job=${row.id}`,
  }));
}

export async function searchPalettePlans(
  query: string,
  signal?: AbortSignal,
): Promise<PaletteItem[]> {
  const rows = await searchEntity("plans", query, signal);
  return rows.map((row) => ({
    id: `plan-${row.id}`,
    group: "Plans" as const,
    title: row.title || `Plan #${row.id}`,
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
  return entityItems("Stores", "stores", rows, (r) =>
    [r.store_no, r.title].filter(Boolean).join(" — ") || `Store #${r.id}`,
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
  return entityItems("Customers", "customers", rows, (r) => r.title || `Customer #${r.id}`);
}

export async function searchPaletteRetailers(
  query: string,
  signal?: AbortSignal,
): Promise<PaletteItem[]> {
  const rows = await searchEntity("retailers", query, signal);
  return entityItems("Retailers", "retailers", rows, (r) => r.title || `Retailer #${r.id}`);
}

export async function searchPalettePrograms(
  query: string,
  signal?: AbortSignal,
): Promise<PaletteItem[]> {
  const rows = await searchEntity("programs", query, signal);
  return entityItems("Programs", "programs", rows, (r) => r.title || `Program #${r.id}`);
}

export async function searchPaletteCycles(
  query: string,
  signal?: AbortSignal,
): Promise<PaletteItem[]> {
  const rows = await searchEntity("cycles", query, signal);
  return entityItems("Cycles", "cycles", rows, (r) => r.title || `Cycle #${r.id}`);
}
