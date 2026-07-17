"use client";

import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSession } from "@/features/auth/hooks";
import { UserRole } from "@/features/auth/types";
import type { ResultsPage } from "@/shared/services/api/pagination";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/utils";
import { jobsColumnsForRole, type JobsColumnKey } from "../columns";
import { formatMinutes, formatUtcDate, JOB_SORT_TO_ORDER, type ListableJob } from "../schemas";
import { JobStatusMenu } from "./job-status-chip";

export interface JobsSort {
  key: string;
  direction: "asc" | "desc";
}

const COLUMN_LABELS: Record<JobsColumnKey, string> = {
  user: "Assignee",
  id: "ID",
  rep_no: "Rep #",
  cycle: "Cycle",
  customer: "Customer",
  program: "Program",
  group: "Group",
  retailer: "Retailer",
  store: "Store",
  opensAt: "Starts",
  closesAt: "Due",
  completedOn: "Completed",
  plannedMinutes: "Planned",
  actualMinutes: "Actual",
  status: "Status",
  status_code: "Code",
};

function assigneeLabel(job: ListableJob): string {
  const first = job.assignees[0];
  if (!first) return "—";
  const name = [first.first_name, first.last_name].filter(Boolean).join(" ").trim();
  const label = name || first.email || (first.rep_no != null ? `#${first.rep_no}` : "—");
  return job.assignees.length > 1 ? `${label} +${job.assignees.length - 1}` : label;
}

function cellValue(key: JobsColumnKey, job: ListableJob): React.ReactNode {
  switch (key) {
    case "user":
      return assigneeLabel(job);
    case "id":
      return job.id;
    case "rep_no":
      return job.assignees[0]?.rep_no ?? "—";
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
      return formatUtcDate(job.visit?.opens_at);
    case "closesAt":
      return formatUtcDate(job.visit?.closes_at);
    case "completedOn":
      return formatUtcDate(job.completed_on);
    case "plannedMinutes":
      return formatMinutes(job.visit?.planned_minutes);
    case "actualMinutes":
      return formatMinutes(job.actual_minutes);
    case "status":
      return <JobStatusMenu job={job} />;
    case "status_code":
      return job.status_code?.code || "—";
    default:
      return "—";
  }
}

const HIDDEN_LG: JobsColumnKey[] = ["opensAt", "completedOn", "status_code"];
const HIDDEN_XL: JobsColumnKey[] = ["plannedMinutes", "actualMinutes", "group", "rep_no"];

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
  const columns = jobsColumnsForRole(role, { showStatus });
  const totalCount = page?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const results = page?.results ?? [];
  const allSelected =
    selectionMode &&
    results.length > 0 &&
    results.every((job) => selectedIds?.has(job.id));

  const toggleSort = (key: string) => {
    if (!JOB_SORT_TO_ORDER[key]) return;
    if (sort?.key !== key) onSortChange({ key, direction: "asc" });
    else if (sort.direction === "asc") onSortChange({ key, direction: "desc" });
    else onSortChange(null);
  };

  const colSpan = columns.length + (selectionMode ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {selectionMode && (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleSelectAll}
                    aria-label="Select all on page"
                  />
                </TableHead>
              )}
              {columns.map((key) => (
                <TableHead
                  key={key}
                  className={cn(
                    HIDDEN_LG.includes(key) && "hidden lg:table-cell",
                    HIDDEN_XL.includes(key) && "hidden xl:table-cell",
                  )}
                >
                  {JOB_SORT_TO_ORDER[key] ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      className="flex items-center gap-1 font-medium hover:text-foreground"
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
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !page ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={colSpan}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
                  No visits found.
                </TableCell>
              </TableRow>
            ) : (
              results.map((job) => (
                <TableRow
                  key={job.id}
                  onClick={() => {
                    if (selectionMode) {
                      onToggleSelect?.(job.id);
                      return;
                    }
                    onRowClick(job);
                  }}
                  className={cn("cursor-pointer", isLoading && "opacity-60")}
                >
                  {selectionMode && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds?.has(job.id) ?? false}
                        onChange={() => onToggleSelect?.(job.id)}
                        aria-label={`Select visit ${job.id}`}
                      />
                    </TableCell>
                  )}
                  {columns.map((key) => (
                    <TableCell
                      key={key}
                      className={cn(
                        HIDDEN_LG.includes(key) && "hidden lg:table-cell",
                        HIDDEN_XL.includes(key) && "hidden xl:table-cell",
                      )}
                    >
                      {cellValue(key, job)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
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
          <span>
            Page {Math.min(pageIndex + 1, pageCount)} of {pageCount} · {totalCount} visits
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pageIndex === 0}
            onClick={() => onPageChange(pageIndex - 1, pageSize)}
          >
            Previous
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
