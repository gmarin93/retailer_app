"use client";

import { useQuery } from "@tanstack/react-query";
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

/** Debounce for entity search (Angular uses 600ms). */
function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function useCommandPaletteSearch(query: string, pages: Page[], userId: number) {
  const debouncedQuery = useDebouncedValue(query, 600);
  const q = debouncedQuery.trim();
  const enabled = q.length >= 2;
  const ids = pageIds(pages);
  const jobTarget = jobTargetFromPages(pages);

  const entityQuery = useQuery({
    queryKey: ["command-palette", "entities", q, [...ids].sort().join(","), jobTarget] as const,
    queryFn: async ({ signal }) => {
      const tasks: Promise<PaletteItem[]>[] = [];
      if (jobTarget) {
        tasks.push(
          searchPaletteJobs(q, jobTarget === "review", signal).then((items) =>
            items.map((item) => ({
              ...item,
              href: `/${jobTarget}?job=${item.id.replace("job-", "")}`,
            })),
          ),
        );
      }
      if (ids.has("plan")) tasks.push(searchPalettePlans(q, signal));
      if (ids.has("stores")) tasks.push(searchPaletteStores(q, signal));
      if (ids.has("users")) tasks.push(searchPaletteUsers(q, signal));
      if (ids.has("customers")) tasks.push(searchPaletteCustomers(q, signal));
      if (ids.has("retailers")) tasks.push(searchPaletteRetailers(q, signal));
      if (ids.has("programs")) tasks.push(searchPalettePrograms(q, signal));
      if (ids.has("cycles")) tasks.push(searchPaletteCycles(q, signal));

      const settled = await Promise.allSettled(tasks);
      const next: PaletteItem[] = [];
      for (const result of settled) {
        if (result.status === "fulfilled") next.push(...result.value);
      }
      return next;
    },
    enabled,
    staleTime: 30_000,
  });

  const staticItems = useMemo(() => {
    return [
      ...recentItems(userId, query),
      ...pageItems(pages, query),
      ...actionItems(query),
    ];
  }, [pages, query, userId]);

  const items = useMemo(() => {
    const all = [...staticItems, ...(enabled ? (entityQuery.data ?? []) : [])];
    return all.sort(
      (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group),
    );
  }, [staticItems, entityQuery.data, enabled]);

  return { items, searching: enabled && entityQuery.isFetching };
}
