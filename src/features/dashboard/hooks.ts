"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  cycleYear,
  getCurrentCycle,
  mostRecentlyStartedCycle,
  useCyclesByDate,
  type ListableCycle,
} from "@/shared/services/entities/cycles";
import { useCustomersByTitle } from "@/shared/services/entities/customers";
import {
  deriveTotalHoursFromChart,
  fetchDashboardStats,
  fetchFillRateChart,
  fetchPendingReviewsByCustomer,
  fetchPlanDocuments,
  fetchTotalHoursByClients,
} from "./api";
import {
  PLAN_DOCUMENTS_PREVIEW_LIMIT,
  samplePlanDocuments,
  type TotalHoursStatus,
} from "./schemas";

/** Default number of recent cycles used when no explicit selection (Note 149). */
const DEFAULT_VISIBLE_CYCLES = 12;

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: () => [...dashboardKeys.all, "stats"] as const,
  chart: (filter: { cycleIds: number[]; customerIds: number[]; groupBy?: string }) =>
    [...dashboardKeys.all, "chart", filter] as const,
  totalHours: (cycleId: number | null, status: TotalHoursStatus) =>
    [...dashboardKeys.all, "total-hours", { cycleId, status }] as const,
  pendingReviews: (cycleIds: number[]) =>
    [...dashboardKeys.all, "pending-reviews", { cycleIds }] as const,
  planDocuments: (cycleId: number | null) =>
    [...dashboardKeys.all, "plan-documents", { cycleId }] as const,
};

export interface DashboardFilters {
  view: "byClient" | "byMonth";
  setView: (view: "byClient" | "byMonth") => void;
  selectedCycleIds: number[];
  setSelectedCycleIds: (ids: number[]) => void;
  year: number | null;
  setYear: (year: number | null) => void;
  selectedCustomerIds: number[];
  setSelectedCustomerIds: (ids: number[]) => void;
  showAllCycles: boolean;
  setShowAllCycles: (show: boolean) => void;
}

/** Chart filter state (component-local; not persisted, same as Angular). */
export function useDashboardFilters(): DashboardFilters {
  const [view, setView] = useState<"byClient" | "byMonth">("byClient");
  const [selectedCycleIds, setSelectedCycleIds] = useState<number[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [showAllCycles, setShowAllCycles] = useState(false);
  return {
    view,
    setView,
    selectedCycleIds,
    setSelectedCycleIds,
    year,
    setYear,
    selectedCustomerIds,
    setSelectedCustomerIds,
    showAllCycles,
    setShowAllCycles,
  };
}

export interface CycleScope {
  cycles: ListableCycle[];
  cyclesLoading: boolean;
  availableYears: number[];
  visibleCycles: ListableCycle[];
  hasMoreCycles: boolean;
  currentCycle: ListableCycle | null;
  /** Cycle ids the chart and cycle-scoped cards are scoped to (Note 149). */
  scopedCycleIds: number[];
  /** Single cycle the total-hours card reports on. */
  totalHoursCycle: ListableCycle | null;
  /** Cycle label for the pending-reviews card. */
  scopedCycleTitle: string;
}

/** Resolves the cycle scope shared by the chart and cycle-scoped cards. */
export function useCycleScope(filters: DashboardFilters): CycleScope {
  const { data: cycles = [], isLoading: cyclesLoading } = useCyclesByDate();

  return useMemo(() => {
    const availableYears = Array.from(
      new Set(cycles.map(cycleYear).filter((y): y is number => y !== null)),
    ).sort((a, b) => b - a);

    const visibleCycles = filters.showAllCycles
      ? cycles
      : cycles.slice(0, DEFAULT_VISIBLE_CYCLES);

    const selected = cycles.filter((c) => filters.selectedCycleIds.includes(c.id));

    let scopedCycles: ListableCycle[];
    if (selected.length > 0) {
      scopedCycles = selected;
    } else {
      const byYear = filters.year
        ? visibleCycles.filter((c) => cycleYear(c) === filters.year)
        : visibleCycles;
      scopedCycles = byYear.length > 0 ? byYear : visibleCycles;
    }

    let totalHoursCycle: ListableCycle | null;
    if (selected.length > 0) {
      totalHoursCycle = mostRecentlyStartedCycle(selected);
    } else if (filters.year) {
      const inYear = cycles.filter((c) => cycleYear(c) === filters.year);
      totalHoursCycle =
        inYear.length > 0 ? mostRecentlyStartedCycle(inYear) : getCurrentCycle(cycles);
    } else {
      totalHoursCycle = getCurrentCycle(cycles);
    }

    const titles = scopedCycles.map((c) => c.title).filter(Boolean);
    let scopedCycleTitle: string;
    if (titles.length === 1) {
      scopedCycleTitle = titles[0]!;
    } else if (titles.length > 1 && titles.length <= 3) {
      scopedCycleTitle = titles.join(", ");
    } else {
      scopedCycleTitle = `${scopedCycles.length} cycles`;
    }

    return {
      cycles,
      cyclesLoading,
      availableYears,
      visibleCycles,
      hasMoreCycles: cycles.length > DEFAULT_VISIBLE_CYCLES,
      currentCycle: getCurrentCycle(cycles),
      scopedCycleIds: scopedCycles.map((c) => c.id),
      totalHoursCycle,
      scopedCycleTitle,
    };
  }, [cycles, cyclesLoading, filters.selectedCycleIds, filters.year, filters.showAllCycles]);
}

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: ({ signal }) => fetchDashboardStats(signal),
  });
}

export function useAvailableCustomers() {
  return useCustomersByTitle();
}

export function useFillRateChart(scope: CycleScope, filters: DashboardFilters) {
  const filter = {
    cycleIds: scope.scopedCycleIds,
    customerIds: filters.selectedCustomerIds,
    groupBy: filters.view === "byMonth" ? ("month" as const) : undefined,
  };
  return useQuery({
    queryKey: dashboardKeys.chart(filter),
    queryFn: ({ signal }) => fetchFillRateChart(filter, signal),
    enabled: !scope.cyclesLoading,
  });
}

/**
 * Total hours by client for the resolved cycle + status tab. When the
 * aggregated endpoint is missing (404/501) the entries are derived from the
 * chart data, mirroring the Angular fallback.
 */
export function useTotalHours(
  scope: CycleScope,
  status: TotalHoursStatus,
  chart: ReturnType<typeof useFillRateChart>,
) {
  const cycle = scope.totalHoursCycle;
  const query = useQuery({
    queryKey: dashboardKeys.totalHours(cycle?.id ?? null, status),
    queryFn: ({ signal }) => fetchTotalHoursByClients(cycle!.id, status, signal),
    enabled: cycle !== null,
  });

  const endpointMissing = query.data?.endpointMissing ?? false;
  const entries = endpointMissing
    ? deriveTotalHoursFromChart(chart.data ?? [], status)
    : (query.data?.entries ?? []);

  return {
    entries,
    cycleTitle: (!endpointMissing && query.data?.cycleTitle) || cycle?.title || "",
    isLoading: query.isLoading || (endpointMissing && chart.isLoading),
  };
}

export function usePendingReviews(scope: CycleScope) {
  const cycleIds = scope.scopedCycleIds;
  const query = useQuery({
    queryKey: dashboardKeys.pendingReviews(cycleIds),
    // The title is display-only and fully derived from cycleIds, so it does
    // not belong in the query key.
    queryFn: ({ signal }) => fetchPendingReviewsByCustomer(cycleIds, "", signal),
    enabled: cycleIds.length > 0,
  });
  return {
    entries: query.data?.entries ?? [],
    cycleTitle: query.data?.cycleTitle || scope.scopedCycleTitle,
    cycleIds,
    isLoading: query.isLoading && cycleIds.length > 0,
  };
}

/**
 * Preview: a random sample from the current cycle's documents, falling back to
 * all cycles when the current cycle has none — so the card shows documents
 * whenever any exist instead of sitting empty until "View documents".
 */
export function usePlanDocuments(scope: CycleScope) {
  const cycleId = scope.currentCycle?.id ?? null;
  return useQuery({
    queryKey: dashboardKeys.planDocuments(cycleId),
    queryFn: async ({ signal }) => {
      if (cycleId !== null) {
        const cycleDocs = await fetchPlanDocuments({ cycleId }, signal);
        if (cycleDocs.length > 0) {
          return samplePlanDocuments(cycleDocs, PLAN_DOCUMENTS_PREVIEW_LIMIT);
        }
      }
      const allDocs = await fetchPlanDocuments({}, signal);
      return samplePlanDocuments(allDocs, PLAN_DOCUMENTS_PREVIEW_LIMIT);
    },
    enabled: !scope.cyclesLoading,
  });
}

/** Historical list for the "View documents" dialog (all cycles, no limit). */
export function useAllPlanDocuments(enabled: boolean) {
  return useQuery({
    queryKey: [...dashboardKeys.all, "plan-documents-all"],
    queryFn: ({ signal }) => fetchPlanDocuments({}, signal),
    enabled,
    staleTime: 5 * 60_000,
  });
}
