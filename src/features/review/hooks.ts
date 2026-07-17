"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { JobsSort } from "@/features/jobs/components/jobs-table";
import { EMPTY_JOBS_FILTER, type JobsFilterFields } from "@/features/jobs/filters";
import { useJobDetail, useJobsPage } from "@/features/jobs/hooks";
import { applyJobsFilterFields } from "@/features/jobs/query-from-filters";
import {
  CLOSES_AT_ORDERINGS,
  JOB_SORT_TO_ORDER,
  OPENS_AT_ORDERINGS,
  STATUS_ORDERINGS,
  type ListableJob,
} from "@/features/jobs/schemas";

export const PAGE_SIZE_OPTIONS = [20, 100, 500];

const VALID_STATUSES = ["planned", "open", "pending", "completed", "cancelled", "invoiced"];

function parseIntList(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => Number.parseInt(part, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/** `/review` query-param filters (ported from `ReviewMasterComponent` + Command Center). */
interface RouteFilters {
  jobId: number | null;
  statuses: string[];
  assignees: number[];
  customers: number[];
  programs: number[];
  cycles: number[];
  overdue: boolean;
  unassigned: boolean;
}

function parseRouteFilters(params: URLSearchParams): RouteFilters {
  const jobParam = params.get("job");
  const jobId = jobParam ? Number.parseInt(jobParam, 10) : NaN;
  const truthy = (raw: string | null) => raw === "true" || raw === "1";
  return {
    jobId: Number.isFinite(jobId) && jobId > 0 ? jobId : null,
    statuses: (params.get("status") ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => VALID_STATUSES.includes(s)),
    assignees: parseIntList(params.get("assignee")),
    customers: parseIntList(params.get("customer")),
    programs: parseIntList(params.get("program")),
    cycles: parseIntList(params.get("cycle")),
    overdue: truthy(params.get("overdue")),
    unassigned: truthy(params.get("unassigned")),
  };
}

/**
 * Master/detail state for the review page — the React twin of
 * `ReviewMasterBloc` (reviewable jobs, default status+date ordering) plus the
 * query-param filters the dashboard/chart drill-downs navigate with.
 */
export function useReviewMasterDetail() {
  const searchParams = useSearchParams();
  const routeFilters = useMemo(() => parseRouteFilters(searchParams), [searchParams]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<JobsFilterFields>(EMPTY_JOBS_FILTER);
  const [sort, setSort] = useState<JobsSort | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]!);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  /** Route filters are dropped once the user searches manually. */
  const [routeFiltersCleared, setRouteFiltersCleared] = useState(false);

  // Deep link `?job=` auto-opens the visit (state adjusted during render).
  const [handledJobParam, setHandledJobParam] = useState<number | null>(null);
  if (routeFilters.jobId !== null && routeFilters.jobId !== handledJobParam) {
    setHandledJobParam(routeFilters.jobId);
    setSelectedJobId(routeFilters.jobId);
  }

  /**
   * Base ordering ported from `JobMasterBlocBase.refreshJobs`: user sort first,
   * then status desc, closes_at asc, opens_at asc as defaults.
   */
  const order = useMemo(() => {
    const result: string[] = [];
    if (sort) {
      const entry = JOB_SORT_TO_ORDER[sort.key];
      if (entry) result.push(sort.direction === "asc" ? entry[0] : entry[1]);
    }
    if (!result.some((o) => STATUS_ORDERINGS.includes(o))) {
      result.push(STATUS_ORDERINGS[1]!);
    }
    if (!result.some((o) => CLOSES_AT_ORDERINGS.includes(o))) {
      result.push(CLOSES_AT_ORDERINGS[0]!);
    }
    if (!result.some((o) => OPENS_AT_ORDERINGS.includes(o))) {
      result.push(OPENS_AT_ORDERINGS[0]!);
    }
    return result;
  }, [sort]);

  const activeRouteFilters = routeFiltersCleared ? null : routeFilters;

  const query = useMemo(
    () =>
      applyJobsFilterFields(
        {
          view: "reviewable" as const,
          page: pageIndex,
          pageSize,
          search: search || undefined,
          order,
          ids: activeRouteFilters?.jobId ? [activeRouteFilters.jobId] : undefined,
          statuses: activeRouteFilters?.statuses.length
            ? activeRouteFilters.statuses
            : undefined,
          assignees: activeRouteFilters?.assignees.length
            ? activeRouteFilters.assignees
            : undefined,
          customers: activeRouteFilters?.customers.length
            ? activeRouteFilters.customers
            : undefined,
          programs: activeRouteFilters?.programs.length
            ? activeRouteFilters.programs
            : undefined,
          cycles: activeRouteFilters?.cycles.length ? activeRouteFilters.cycles : undefined,
          overdue: activeRouteFilters?.overdue || undefined,
          unassigned: activeRouteFilters?.unassigned || undefined,
        },
        filter,
      ),
    [pageIndex, pageSize, search, order, activeRouteFilters, filter],
  );

  const jobsQuery = useJobsPage(query);
  const detailQuery = useJobDetail(selectedJobId, "reviewable");
  const jobs = jobsQuery.data?.results ?? [];

  const applySearch = (value: string) => {
    setSearch(value);
    setRouteFiltersCleared(true);
    setPageIndex(0);
  };

  const applyFilter = (next: JobsFilterFields) => {
    setFilter(next);
    setRouteFiltersCleared(true);
    setPageIndex(0);
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    const ids = jobs.map((j) => j.id);
    setSelectedIds((prev) =>
      ids.length > 0 && ids.every((id) => prev.has(id)) ? new Set() : new Set(ids),
    );
  };

  const currentIndex = jobs.findIndex((job) => job.id === selectedJobId);
  const viewPreviousJob = () => {
    if (jobs.length === 0) return;
    setSelectedJobId(jobs[currentIndex > 0 ? currentIndex - 1 : jobs.length - 1]!.id);
  };
  const viewNextJob = () => {
    if (jobs.length === 0) return;
    setSelectedJobId(jobs[(currentIndex + 1) % jobs.length]!.id);
  };

  return {
    page: jobsQuery.data,
    isListLoading: jobsQuery.isLoading || jobsQuery.isFetching,
    listError: jobsQuery.isError ? jobsQuery.error : null,
    refetchList: jobsQuery.refetch,
    hasRouteFilters:
      !routeFiltersCleared &&
      (routeFilters.statuses.length > 0 ||
        routeFilters.assignees.length > 0 ||
        routeFilters.customers.length > 0 ||
        routeFilters.programs.length > 0 ||
        routeFilters.cycles.length > 0 ||
        routeFilters.overdue ||
        routeFilters.unassigned ||
        routeFilters.jobId !== null),
    clearRouteFilters: () => setRouteFiltersCleared(true),
    search,
    applySearch,
    filter,
    applyFilter,
    filterQuery: applyJobsFilterFields(
      {
        view: "reviewable" as const,
        search: search || undefined,
        ids: activeRouteFilters?.jobId ? [activeRouteFilters.jobId] : undefined,
        statuses: activeRouteFilters?.statuses.length
          ? activeRouteFilters.statuses
          : undefined,
        customers: activeRouteFilters?.customers.length
          ? activeRouteFilters.customers
          : undefined,
        programs: activeRouteFilters?.programs.length
          ? activeRouteFilters.programs
          : undefined,
        cycles: activeRouteFilters?.cycles.length ? activeRouteFilters.cycles : undefined,
        overdue: activeRouteFilters?.overdue || undefined,
        unassigned: activeRouteFilters?.unassigned || undefined,
      },
      filter,
    ),
    selectionMode,
    setSelectionMode,
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    clearSelection: () => setSelectedIds(new Set()),
    sort,
    setSort: (next: JobsSort | null) => {
      setSort(next);
      setPageIndex(0);
    },
    pageIndex,
    pageSize,
    setPage: (index: number, size: number) => {
      setPageIndex(size === pageSize ? index : 0);
      setPageSize(size);
    },
    selectedJobId,
    detail: detailQuery.data ?? null,
    detailError: detailQuery.isError ? detailQuery.error : null,
    openJob: (job: ListableJob) => setSelectedJobId(job.id),
    closeDetail: () => setSelectedJobId(null),
    viewPreviousJob,
    viewNextJob,
  };
}
