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

/**
 * Master/detail state for the archives page — the React twin of
 * `ArchivesMasterBloc` (archived jobs, base-bloc default ordering) with the
 * `?job=` deep link.
 */
export function useArchivesMasterDetail() {
  const searchParams = useSearchParams();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<JobsFilterFields>(EMPTY_JOBS_FILTER);
  const [sort, setSort] = useState<JobsSort | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]!);
  const [deepLinkIds, setDeepLinkIds] = useState<number[] | undefined>(undefined);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Deep link `?job=` (state adjusted during render, same as itinerary/review).
  const jobParam = searchParams.get("job");
  const [handledJobParam, setHandledJobParam] = useState<string | null>(null);
  if (jobParam && jobParam !== handledJobParam) {
    setHandledJobParam(jobParam);
    const jobId = Number.parseInt(jobParam, 10);
    if (Number.isFinite(jobId) && jobId > 0) {
      setDeepLinkIds([jobId]);
      setPageIndex(0);
      setSelectedJobId(jobId);
    }
  }

  /** Base ordering from `JobMasterBlocBase`: status desc, due asc, start asc. */
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

  const query = useMemo(
    () =>
      applyJobsFilterFields(
        {
          view: "archived" as const,
          page: pageIndex,
          pageSize,
          search: search || undefined,
          order,
          ids: deepLinkIds,
        },
        filter,
      ),
    [pageIndex, pageSize, search, order, deepLinkIds, filter],
  );

  const jobsQuery = useJobsPage(query);
  const detailQuery = useJobDetail(selectedJobId, "archived");
  const jobs = jobsQuery.data?.results ?? [];

  const applySearch = (value: string) => {
    setSearch(value);
    setDeepLinkIds(undefined);
    setPageIndex(0);
  };

  const applyFilter = (next: JobsFilterFields) => {
    setFilter(next);
    setDeepLinkIds(undefined);
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
    search,
    applySearch,
    filter,
    applyFilter,
    filterQuery: applyJobsFilterFields(
      {
        view: "archived" as const,
        search: search || undefined,
        ids: deepLinkIds,
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
