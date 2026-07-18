"use client";

import { Add01Icon, ArrowDown01Icon, ArrowUp01Icon, ViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSession } from "@/features/auth/hooks";
import { UserRole } from "@/features/auth/types";
import type { ResultsPage } from "@/shared/services/api/pagination";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { UserAvatar } from "@/shared/components/user/user-avatar";
import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { cn } from "@/shared/lib/utils";
import { jobsColumnsForViewport, type JobsColumnKey } from "../columns";
import {
  formatMinutes,
  formatUtcDateShort,
  JOB_SORT_TO_ORDER,
  type ListableJob,
} from "../schemas";
import { JobStatusMenu } from "./job-status-chip";

export interface JobsSort {
  key: string;
  direction: "asc" | "desc";
}

const COLUMN_LABELS: Record<JobsColumnKey, string> = {
  user: "User",
  id: "Visit ID",
  cycle: "Cycle",
  customer: "Customer",
  program: "Program",
  group: "Group",
  retailer: "Retailer",
  store: "Store",
  opensAt: "Start Date",
  closesAt: "Due Date",
  completedOn: "Completed Date",
  plannedMinutes: "Planned time",
  actualMinutes: "Actual time",
  status: "Status",
  status_code: "Status code",
};

function AssigneesCell({ job }: { job: ListableJob }) {
  if (job.assignees.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex items-center -space-x-1.5" onClick={(e) => e.stopPropagation()}>
      {job.assignees.slice(0, 3).map((assignee) => (
        <UserAvatar key={assignee.id} user={assignee} size={32} />
      ))}
      {job.assignees.length > 3 && (
        <span className="ml-2 text-xs font-medium text-muted-foreground">
          +{job.assignees.length - 3}
        </span>
      )}
    </div>
  );
}

function cellValue(key: JobsColumnKey, job: ListableJob): React.ReactNode {
  switch (key) {
    case "user":
      return <AssigneesCell job={job} />;
    case "id":
      return <span className="font-medium text-[#4c6fff]">{job.id}</span>;
    case "cycle":
      return job.cycle?.title ?? "—";
    case "customer":
      return job.customer?.title ?? "—";
    case "program":
      return job.program?.title ?? "—";
    case "group":
      return job.group || job.plan?.group || "—";
    case "retailer":
      return job.retailer?.title ?? "—";
    case "store":
      return job.store
        ? `${job.store.store_no != null ? `#${job.store.store_no} ` : ""}${job.store.title}`
        : "—";
    case "opensAt":
      return formatUtcDateShort(job.visit?.opens_at);
    case "closesAt":
      return formatUtcDateShort(job.visit?.closes_at);
    case "completedOn":
      return formatUtcDateShort(job.completed_on);
    case "plannedMinutes":
      return formatMinutes(job.visit?.planned_minutes) || "—";
    case "actualMinutes":
      return formatMinutes(job.actual_minutes) || "—";
    case "status":
      return <JobStatusMenu job={job} />;
    case "status_code":
      return job.status_code?.code ? (
        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-muted dark:text-muted-foreground">
          {job.status_code.code}
        </span>
      ) : (
        "—"
      );
    default:
      return "—";
  }
}

export function JobsTable({
  page,
  isLoading,
  sort,
  onSortChange,
  pageIndex,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onRowClick,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  showStatus = true,
}: {
  page?: ResultsPage<ListableJob>;
  isLoading: boolean;
  sort: JobsSort | null;
  onSortChange: (sort: JobsSort | null) => void;
  pageIndex: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageChange: (pageIndex: number, pageSize: number) => void;
  onRowClick: (job: ListableJob) => void;
  selectionMode?: boolean;
  selectedIds?: Set<number>;
  onToggleSelect?: (jobId: number) => void;
  onToggleSelectAll?: () => void;
  /** Archives hides status columns. */
  showStatus?: boolean;
}) {
  const session = useSession();
  const role = session?.user.role ?? UserRole.FIELD_REP;
  const isMobile = useMediaQuery("(max-width: 767px)");
  const columns = jobsColumnsForViewport(role, isMobile, { showStatus });
  const totalCount = page?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const results = page?.results ?? [];
  const allSelected =
    selectionMode && results.length > 0 && results.every((job) => selectedIds?.has(job.id));

  const toggleSort = (key: string) => {
    if (!JOB_SORT_TO_ORDER[key]) return;
    if (sort?.key !== key) onSortChange({ key, direction: "asc" });
    else if (sort.direction === "asc") onSortChange({ key, direction: "desc" });
    else onSortChange(null);
  };

  const colSpan = columns.length + (selectionMode ? 1 : 0) + 1;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:border-border dark:bg-card">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left md:min-w-0">
          <thead>
            <tr className="h-12">
              {selectionMode && (
                <th className="sticky top-0 z-[1] w-10 bg-[#eef3ff] px-3 shadow-[0_1px_0_0_#d9e0ed] dark:bg-[#1e2540]">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    aria-label="Select all on page"
                  />
                </th>
              )}
              {columns.map((key) => (
                <th
                  key={key}
                  className="sticky top-0 z-[1] bg-[#eef3ff] px-3 text-[11.5px] font-semibold tracking-[0.02em] whitespace-nowrap text-[#3d4f6f] uppercase shadow-[0_1px_0_0_#d9e0ed] dark:bg-[#1e2540] dark:text-foreground"
                >
                  {JOB_SORT_TO_ORDER[key] ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      className="flex items-center gap-1 font-semibold hover:text-foreground focus-visible:outline-none"
                      aria-label={`Sort by ${COLUMN_LABELS[key]}`}
                    >
                      {COLUMN_LABELS[key]}
                      {sort?.key === key && (
                        <HugeiconsIcon
                          icon={sort.direction === "asc" ? ArrowUp01Icon : ArrowDown01Icon}
                          aria-hidden="true"
                          className="size-3.5"
                        />
                      )}
                    </button>
                  ) : (
                    COLUMN_LABELS[key]
                  )}
                </th>
              ))}
              <th className="sticky top-0 z-[1] w-14 bg-[#eef3ff] px-2 shadow-[0_1px_0_0_#d9e0ed] dark:bg-[#1e2540]" />
            </tr>
          </thead>
          <tbody>
            {isLoading && !page ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={colSpan} className="px-3 py-3">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))
            ) : results.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-3 py-10 text-center text-muted-foreground"
                >
                  No visits found.
                </td>
              </tr>
            ) : (
              results.map((job) => {
                const activateRow = () => {
                  if (selectionMode) {
                    onToggleSelect?.(job.id);
                    return;
                  }
                  onRowClick(job);
                };
                return (
                  <tr
                    key={job.id}
                    tabIndex={0}
                    onClick={activateRow}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        activateRow();
                      }
                    }}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-[#f8faff] focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none focus-visible:ring-inset dark:hover:bg-accent/40",
                      isLoading && "opacity-60",
                    )}
                  >
                    {selectionMode && (
                      <td
                        className="border-b border-[#f0f3f9] px-3 py-2.5 dark:border-border"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds?.has(job.id) ?? false}
                          onChange={() => onToggleSelect?.(job.id)}
                          aria-label={`Select visit ${job.id}`}
                        />
                      </td>
                    )}
                    {columns.map((key) => (
                      <td
                        key={key}
                        className="border-b border-[#f0f3f9] px-3 py-2.5 text-[13px] whitespace-nowrap text-[#202224] dark:border-border dark:text-foreground"
                      >
                        {cellValue(key, job)}
                      </td>
                    ))}
                    <td
                      className="border-b border-[#f0f3f9] px-2 py-2 dark:border-border"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label="Quick actions"
                            title="Quick actions"
                            className="inline-flex size-8 items-center justify-center rounded-full bg-[#4c6fff] text-white shadow-sm transition hover:bg-[#3a5cf0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/40"
                          >
                            <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" searchable={false} className="w-44">
                          <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => onRowClick(job)}>
                            <HugeiconsIcon icon={ViewIcon} size={16} strokeWidth={1.8} />
                            View
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageChange(0, Number(value))}
          >
            <SelectTrigger size="sm" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm">
            {isMobile
              ? `${pageIndex + 1}/${pageCount}`
              : `Page ${Math.min(pageIndex + 1, pageCount)} of ${pageCount} · ${totalCount} visits`}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pageIndex === 0}
            onClick={() => onPageChange(pageIndex - 1, pageSize)}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pageIndex + 1 >= pageCount}
            onClick={() => onPageChange(pageIndex + 1, pageSize)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
