"use client";

import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { Page } from "@/shared/constants/pages";
import {
  searchPaletteCustomers,
  searchPaletteCycles,
  searchPaletteJobs,
  searchPalettePlans,
  searchPalettePrograms,
  searchPaletteRetailers,
  searchPaletteStores,
  searchPaletteUsers,
} from "./api";
import type { PaletteGroup, PaletteItem } from "./types";
import { actionItems, jobTargetFromPages, pageIds, pageItems, recentItems } from "./utils";

const GROUP_ORDER: PaletteGroup[] = [
  "Recent",
  "Pages",
  "Actions",
  "Jobs",
  "Plans",
  "Stores",
  "Reps",
  "Customers",
  "Retailers",
  "Programs",
  "Cycles",
];

type EntitySource = {
  key: string;
  search: (query: string, signal?: AbortSignal) => Promise<PaletteItem[]>;
};

/** Debounce for entity search (Angular uses 600ms). */
function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Builds role-gated entity sources. Each source is its own query so a slow/failing
 * plans request cannot block jobs (Angular streams per-endpoint the same way).
 */
function entitySources(pages: Page[]): EntitySource[] {
  const ids = pageIds(pages);
  const jobTarget = jobTargetFromPages(pages);
  const sources: EntitySource[] = [];

  if (jobTarget) {
    sources.push({
      key: `jobs:${jobTarget}`,
      search: async (query, signal) => {
        const items = await searchPaletteJobs(query, jobTarget === "review", signal);
        return items.map((item) => ({
          ...item,
          href: `/${jobTarget}?job=${item.id.replace("job-", "")}`,
        }));
      },
    });
  }
  if (ids.has("plan")) {
    sources.push({ key: "plans", search: searchPalettePlans });
  }
  if (ids.has("stores")) {
    sources.push({ key: "stores", search: searchPaletteStores });
  }
  if (ids.has("users")) {
    sources.push({ key: "users", search: searchPaletteUsers });
  }
  if (ids.has("customers")) {
    sources.push({ key: "customers", search: searchPaletteCustomers });
  }
  if (ids.has("retailers")) {
    sources.push({ key: "retailers", search: searchPaletteRetailers });
  }
  if (ids.has("programs")) {
    sources.push({ key: "programs", search: searchPalettePrograms });
  }
  if (ids.has("cycles")) {
    sources.push({ key: "cycles", search: searchPaletteCycles });
  }

  return sources;
}

export function useCommandPaletteSearch(query: string, pages: Page[], userId: number) {
  const debouncedQuery = useDebouncedValue(query, 600);
  const q = debouncedQuery.trim();
  const enabled = q.length >= 2;
  const pageKey = [...pages]
    .map((page) => page.id)
    .sort()
    .join(",");
  const sources = useMemo(() => entitySources(pages), [pageKey, pages]);

  const entityQueries = useQueries({
    queries: sources.map((source) => ({
      queryKey: ["command-palette", "entities", source.key, q] as const,
      queryFn: ({ signal }: { signal?: AbortSignal }) => source.search(q, signal),
      enabled,
      staleTime: 30_000,
      retry: 1,
    })),
  });

  const staticItems = useMemo(() => {
    return [...recentItems(userId, query), ...pageItems(pages, query), ...actionItems(query)];
  }, [pageKey, pages, query, userId]);

  const fromEntities = entityQueries.flatMap((result) => result.data ?? []);
  const searching = enabled && entityQueries.some((result) => result.isFetching);

  const items = useMemo(() => {
    const all = [...staticItems, ...(enabled ? fromEntities : [])];
    return all.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
  }, [staticItems, enabled, fromEntities]);

  return { items, searching };
}
