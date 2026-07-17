import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { env } from "@/shared/lib/env";
import { api } from "@/shared/services/api";
import {
  FETCH_ALL_PAGE_SIZE,
  fetchAllPages,
  resultsPageSchema,
} from "@/shared/services/api/pagination";

/** Reference entity: stores / store regions (v2), for jobs filters. */

export const listableStoreSchema = z.looseObject({
  id: z.number(),
  title: z.string().catch(""),
  store_no: z.union([z.string(), z.number()]).nullish(),
  province: z.string().nullish(),
  retailer: z.looseObject({ id: z.number(), title: z.string().catch("") }).nullish(),
});

export type ListableStore = z.infer<typeof listableStoreSchema>;

export const listableStoreRegionSchema = z.looseObject({
  id: z.number(),
  name: z.string().catch(""),
  province: z.string().nullish(),
});

export type ListableStoreRegion = z.infer<typeof listableStoreRegionSchema>;

const storePageSchema = resultsPageSchema(listableStoreSchema);
const storeRegionPageSchema = resultsPageSchema(listableStoreRegionSchema);

export interface StoreListQuery {
  retailers?: number[];
  provinces?: string[];
  regions?: number[];
}

export interface StoreRegionListQuery {
  provinces?: string[];
}

export const storeKeys = {
  all: ["stores"] as const,
  list: (q: StoreListQuery) => [...storeKeys.all, "list", q] as const,
  regions: (q: StoreRegionListQuery) => [...storeKeys.all, "regions", q] as const,
};

/** Stores filtered by retailer / province / region (Angular `getAllStores`). */
async function fetchStores(query: StoreListQuery, signal?: AbortSignal): Promise<ListableStore[]> {
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${env.apiHost}/v2/stores/`, {
      searchParams: {
        retailer__id__in: query.retailers?.length ? query.retailers.join(",") : undefined,
        province__in: query.provinces?.length ? query.provinces.join(",") : undefined,
        regions__in: query.regions?.length ? query.regions.join(",") : undefined,
        _order: "store_no",
        _page: page,
        _page_size: FETCH_ALL_PAGE_SIZE,
      },
      signal,
    });
    return storePageSchema.parse(data);
  });
}

/** Store regions optionally scoped by province (Angular `getAllStoreRegions`). */
async function fetchStoreRegions(
  query: StoreRegionListQuery,
  signal?: AbortSignal,
): Promise<ListableStoreRegion[]> {
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${env.apiHost}/v2/store_regions/`, {
      searchParams: {
        province__in: query.provinces?.length ? query.provinces.join(",") : undefined,
        _order: "name",
        _page: page,
        _page_size: FETCH_ALL_PAGE_SIZE,
      },
      signal,
    });
    return storeRegionPageSchema.parse(data);
  });
}

/**
 * Load stores only when at least one scope filter is set (Angular short-circuit).
 */
export function useFilteredStores(query: StoreListQuery, enabled = true) {
  const hasScope =
    (query.retailers?.length ?? 0) > 0 ||
    (query.provinces?.length ?? 0) > 0 ||
    (query.regions?.length ?? 0) > 0;
  return useQuery({
    queryKey: storeKeys.list(query),
    queryFn: ({ signal }) => fetchStores(query, signal),
    staleTime: 5 * 60_000,
    enabled: enabled && hasScope,
  });
}

export function useStoreRegions(query: StoreRegionListQuery, enabled = true) {
  return useQuery({
    queryKey: storeKeys.regions(query),
    queryFn: ({ signal }) => fetchStoreRegions(query, signal),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function formatStoreLabel(store: ListableStore): string {
  const head = [store.retailer?.title, store.store_no, store.title].filter(Boolean).join(" · ");
  return head || `Store #${store.id}`;
}
