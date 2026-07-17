import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { env } from "@/shared/lib/env";
import { api } from "@/shared/services/api";
import {
  FETCH_ALL_PAGE_SIZE,
  fetchAllPages,
  resultsPageSchema,
} from "@/shared/services/api/pagination";

/** Reference entity: cycles (v2). Shared across dashboard, review, planning… */

export const listableCycleSchema = z.looseObject({
  id: z.number(),
  title: z.string(),
  starts_on: z.string().nullish(),
  ends_on: z.string().nullish(),
});

export type ListableCycle = z.infer<typeof listableCycleSchema>;

const cyclePageSchema = resultsPageSchema(listableCycleSchema);

export const cycleKeys = {
  all: ["cycles"] as const,
  listByDate: () => [...cycleKeys.all, "list", { order: "-starts_on" }] as const,
};

/** All cycles ordered newest-start first (Angular `getAllCyclesByDate`). */
async function fetchAllCyclesByDate(signal?: AbortSignal): Promise<ListableCycle[]> {
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${env.apiHost}/v2/cycles/`, {
      searchParams: { _order: "-starts_on", _page: page, _page_size: FETCH_ALL_PAGE_SIZE },
      signal,
    });
    return cyclePageSchema.parse(data);
  });
}

export function useCyclesByDate() {
  return useQuery({
    queryKey: cycleKeys.listByDate(),
    queryFn: ({ signal }) => fetchAllCyclesByDate(signal),
    staleTime: 5 * 60_000,
  });
}

// ---------------------------------------------------------------------------
// Current-cycle resolution, ported from the Angular `utils/cycles.ts`.
// ---------------------------------------------------------------------------

function startOfDay(value: string): number {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function isTodayInCycle(todayMs: number, cycle: ListableCycle): boolean {
  if (!cycle.starts_on || !cycle.ends_on) return false;
  return todayMs >= startOfDay(cycle.starts_on) && todayMs <= startOfDay(cycle.ends_on);
}

/**
 * Resolves the active cycle for dashboard cards and default filters.
 * When today is inside no cycle window, prefer the most recently *started*
 * cycle (not `cycles[0]`, which is often a future cycle); when every cycle is
 * in the future, pick the one that starts soonest.
 */
export function getCurrentCycle(cycles: ListableCycle[]): ListableCycle | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const cycleForToday = cycles.find((cycle) => isTodayInCycle(todayMs, cycle));
  if (cycleForToday) return cycleForToday;
  if (cycles.length === 0) return null;

  let mostRecentStarted: ListableCycle | null = null;
  let mostRecentStartMs = -Infinity;
  for (const cycle of cycles) {
    if (!cycle.starts_on) continue;
    const startMs = startOfDay(cycle.starts_on);
    if (startMs <= todayMs && startMs > mostRecentStartMs) {
      mostRecentStarted = cycle;
      mostRecentStartMs = startMs;
    }
  }
  if (mostRecentStarted) return mostRecentStarted;

  return cycles.reduce<ListableCycle | null>((nearest, cycle) => {
    if (!cycle.starts_on) return nearest;
    if (!nearest?.starts_on) return cycle;
    return startOfDay(cycle.starts_on) < startOfDay(nearest.starts_on) ? cycle : nearest;
  }, null);
}

/** Most recently started cycle from a list (used by the total-hours card). */
export function mostRecentlyStartedCycle(cycles: ListableCycle[]): ListableCycle | null {
  return cycles.reduce<ListableCycle | null>((latest, cycle) => {
    if (!latest) return cycle;
    const current = cycle.starts_on ? startOfDay(cycle.starts_on) : -Infinity;
    const best = latest.starts_on ? startOfDay(latest.starts_on) : -Infinity;
    return current > best ? cycle : latest;
  }, null);
}

/** Year of a cycle's start date, or null when unset. */
export function cycleYear(cycle: ListableCycle): number | null {
  return cycle.starts_on ? new Date(cycle.starts_on).getFullYear() : null;
}
