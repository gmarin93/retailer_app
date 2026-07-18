"use client";

import {
  Alert02Icon,
  ArrowLeft01Icon,
  Building02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  HelpCircleIcon,
  HourglassIcon,
  InboxIcon,
  Tick02Icon,
  Upload01Icon,
  UserGroupIcon,
  Calendar03Icon,
  ClipboardIcon,
  Store01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useMemo, useState } from "react";
import { useSession } from "@/features/auth/hooks";
import { canBulkEditJobs } from "@/features/auth/permissions";
import { UserRole } from "@/features/auth/types";
import { JobsEditDialog } from "@/features/jobs/components/jobs-edit-dialog";
import { useAllReps } from "@/features/jobs/hooks";
import {
  formatJobStatus,
  formatMinutes,
  type ListableJob,
} from "@/features/jobs/schemas";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { UserAvatar } from "@/shared/components/user/user-avatar";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { PageHeader } from "@/shared/components/page-header";
import { PROVINCE_OPTIONS } from "@/shared/constants/provinces";
import { PuzzleIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/shared/lib/utils";
import { useOperations, useReassignUserJobs, useUserItineraryJobs } from "../hooks";
import {
  formatUserName,
  weekStatus,
  type UserItinerary,
  type WeekStatus,
} from "../schemas";

const NONE = "__none__";

type StatTone = "blue" | "violet" | "amber" | "red" | "green" | "teal";

const STAT_TONES: Record<StatTone, string> = {
  blue: "bg-primary/12 text-primary",
  violet: "bg-violet-500/12 text-violet-600 dark:text-violet-300",
  amber: "bg-amber-500/14 text-amber-600 dark:text-amber-300",
  red: "bg-[#e85a3a]/12 text-[#e85a3a]",
  green: "bg-green-600/12 text-green-600 dark:text-green-400",
  teal: "bg-teal-500/12 text-teal-600 dark:text-teal-300",
};

/** Angular `operations-stat` / `itinerary-stat` KPI tile. */
function OperationsStatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: IconSvgElement;
  tone: StatTone;
}) {
  return (
    <Card className="shadow-[0_2px_8px_rgba(17,24,39,0.06)]">
      <CardContent className="flex items-center gap-3 px-4 py-3.5">
        <span
          className={cn(
            "inline-flex size-[42px] shrink-0 items-center justify-center rounded-xl",
            STAT_TONES[tone],
          )}
        >
          <HugeiconsIcon icon={icon} aria-hidden="true" className="size-[22px]" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
            {label}
          </span>
          <span className="block text-xl font-bold tracking-tight tabular-nums text-foreground">
            {value}
          </span>
        </span>
      </CardContent>
    </Card>
  );
}

/** Angular `itineraries-table-week-cell` icon + tooltip per threshold. */
const WEEK_ICON: Record<WeekStatus, { icon: typeof Tick02Icon; className: string; title: string }> =
  {
    unknown: {
      icon: HelpCircleIcon,
      className: "text-muted-foreground/60",
      title: "Maximum hours have not been recorded",
    },
    under: {
      icon: CheckmarkCircle02Icon,
      className: "text-green-600",
      title: "Week is under maximum hours",
    },
    near: {
      icon: Alert02Icon,
      className: "text-amber-500",
      title: "Week is near maximum hours",
    },
    over: {
      icon: Alert02Icon,
      className: "text-red-600",
      title: "Week is over maximum hours",
    },
  };

function WeekCells({ row, weekCount }: { row: UserItinerary; weekCount: number }) {
  return (
    <>
      {Array.from({ length: weekCount }, (_, i) => {
        const minutes = row.per_week[i] ?? 0;
        const status = weekStatus(minutes, row.user.max_hours);
        const meta = WEEK_ICON[status];
        return (
          <TableCell key={i} className="tabular-nums">
            <span className="inline-flex items-center gap-1.5" title={meta.title}>
              <HugeiconsIcon
                icon={meta.icon}
                aria-hidden="true"
                className={cn("size-4", meta.className)}
              />
              {(minutes / 60).toFixed(2)}
            </span>
          </TableCell>
        );
      })}
    </>
  );
}

function UserItineraryDetail({
  row,
  cycleId,
  province,
  onBack,
}: {
  row: UserItinerary;
  cycleId: number;
  province: string | null;
  onBack: () => void;
}) {
  const session = useSession();
  const canEdit = canBulkEditJobs(session?.user.role ?? UserRole.FIELD_REP);
  const jobsQuery = useUserItineraryJobs(row.user.id, cycleId, province);
  const jobs = useMemo(() => jobsQuery.data ?? [], [jobsQuery.data]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [reassignOpen, setReassignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [repId, setRepId] = useState<string>("");
  const reps = useAllReps(reassignOpen);
  const reassign = useReassignUserJobs(() => {
    setReassignOpen(false);
    setSelected(new Set());
    setSelectionMode(false);
    void jobsQuery.refetch();
  });

  const stores = useMemo(() => new Set(jobs.map((j) => j.store?.id).filter(Boolean)).size, [jobs]);
  const customers = useMemo(
    () => new Set(jobs.map((j) => j.customer?.id).filter(Boolean)).size,
    [jobs],
  );
  const outstanding = jobs.filter((j) => j.status === "planned" || j.status === "open").length;

  const toggleJob = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} data-icon="inline-start" />
          Back
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold">{formatUserName(row.user)}</h2>
          <p className="text-sm text-muted-foreground">@{row.user.username}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectionMode((on) => !on);
              setSelected(new Set());
            }}
          >
            {selectionMode ? "Cancel selection" : "Select visit"}
          </Button>
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!selectionMode || selected.size === 0}
              onClick={() => setEditOpen(true)}
            >
              Edit ({selected.size})
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={!selectionMode || selected.size === 0}
            onClick={() => setReassignOpen(true)}
          >
            Reassign ({selected.size})
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <OperationsStatCard
          label="Visits"
          value={row.count}
          icon={ClipboardIcon}
          tone="blue"
        />
        <OperationsStatCard
          label="Planned Time"
          value={formatMinutes(row.minutes)}
          icon={Clock01Icon}
          tone="amber"
        />
        <OperationsStatCard
          label="Stores"
          value={stores}
          icon={Store01Icon}
          tone="violet"
        />
        <OperationsStatCard
          label="Customers"
          value={customers}
          icon={Building02Icon}
          tone="teal"
        />
        <OperationsStatCard
          label="Outstanding"
          value={outstanding}
          icon={HourglassIcon}
          tone="red"
        />
      </div>

      {jobsQuery.isLoading ? (
        <LoadingState label="Loading visits…" />
      ) : jobsQuery.isError ? (
        <ErrorState error={jobsQuery.error} onRetry={() => void jobsQuery.refetch()} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={PuzzleIcon}
          title="No visits"
          description="This rep has no visits matching the current filters."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                {selectionMode && <TableHead className="w-10" />}
                <TableHead>ID</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Closes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job: ListableJob) => (
                <TableRow
                  key={job.id}
                  className={cn(selectionMode && "cursor-pointer")}
                  onClick={() => selectionMode && toggleJob(job.id)}
                >
                  {selectionMode && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(job.id)}
                        onChange={() => toggleJob(job.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select visit ${job.id}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="tabular-nums">{job.id}</TableCell>
                  <TableCell>
                    {[job.retailer?.title, job.store?.store_no, job.store?.title]
                      .filter(Boolean)
                      .join(" · ")}
                  </TableCell>
                  <TableCell>{job.customer?.title ?? "—"}</TableCell>
                  <TableCell>{formatJobStatus(job.status)}</TableCell>
                  <TableCell className="tabular-nums">
                    {job.visit?.closes_at
                      ? new Date(job.visit.closes_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reassign visits</DialogTitle>
          </DialogHeader>
          <Select value={repId} onValueChange={setRepId}>
            <SelectTrigger aria-label="Assignee">
              <SelectValue placeholder="Select rep" />
            </SelectTrigger>
            <SelectContent>
              {(reps.data ?? []).map((rep) => (
                <SelectItem key={rep.id} value={String(rep.id)}>
                  {[rep.first_name, rep.last_name].filter(Boolean).join(" ") ||
                    `Rep #${rep.rep_no ?? rep.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReassignOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!repId || reassign.isPending}
              onClick={() =>
                reassign.mutate({ jobs: [...selected], users: [Number(repId)] })
              }
            >
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <JobsEditDialog
        jobIds={[...selected]}
        open={editOpen}
        onOpenChange={setEditOpen}
        onDone={() => {
          setEditOpen(false);
          setSelected(new Set());
          setSelectionMode(false);
          void jobsQuery.refetch();
        }}
      />
    </div>
  );
}

/**
 * Operations: cycle/province/reps itinerary report + publish workflow.
 * Ported from `OperationsComponent` + `ItinerariesTableComponent`.
 */
export function OperationsView() {
  const ops = useOperations();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  if (ops.viewing && ops.searched) {
    return (
      <UserItineraryDetail
        row={ops.viewing}
        cycleId={ops.searched.cycle}
        province={ops.searched.province ?? null}
        onBack={ops.closeDetail}
      />
    );
  }

  const rows = ops.itineraries ?? [];
  const hasItineraries = Boolean(ops.searched && rows.length > 0);
  // Angular sizes week columns from the first row (4 or 5).
  const weekCount = (rows[0]?.per_week.length ?? 0) > 4 ? 5 : 4;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pagedRows = rows.slice(safePageIndex * pageSize, (safePageIndex + 1) * pageSize);
  const formatHours = (hours: number) =>
    hours.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Operations"
          description="Search reps by cycle and province, review weekly hours, and publish their visits."
        />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {hasItineraries ? (
            <>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {ops.aggregates.repCount} rep{ops.aggregates.repCount === 1 ? "" : "s"}
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {formatHours(ops.aggregates.totalHours)} hrs
              </span>
              {ops.aggregates.repsToPublish > 0 ? (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                  {ops.aggregates.repsToPublish} to publish
                </span>
              ) : (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  All published
                </span>
              )}
            </>
          ) : (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              No results yet
            </span>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="ops-cycle">
              Cycle
            </label>
            <Select
              value={ops.cycleId != null ? String(ops.cycleId) : undefined}
              onValueChange={(v) => ops.setCycleId(Number(v))}
            >
              <SelectTrigger id="ops-cycle" className="w-[200px]">
                <SelectValue placeholder="Select cycle" />
              </SelectTrigger>
              <SelectContent>
                {ops.cycles.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="ops-province">
              Province
            </label>
            <Select
              value={ops.province ?? NONE}
              onValueChange={(v) => ops.setProvince(v === NONE ? null : v)}
            >
              <SelectTrigger id="ops-province" className="w-[200px]">
                <SelectValue placeholder="All provinces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>(None)</SelectItem>
                {PROVINCE_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="ops-reps">
              Reps
            </label>
            <Input
              id="ops-reps"
              className="w-[200px]"
              value={ops.reps}
              onChange={(e) => ops.setReps(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPageIndex(0);
                  ops.search();
                }
              }}
              placeholder="Reps"
            />
          </div>
          <Button
            type="button"
            onClick={() => {
              setPageIndex(0);
              ops.search();
            }}
          >
            Search
          </Button>
        </CardContent>
      </Card>

      {hasItineraries && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <OperationsStatCard
            label="Reps"
            value={ops.aggregates.repCount}
            icon={UserGroupIcon}
            tone="blue"
          />
          <OperationsStatCard
            label="Total Hours"
            value={formatHours(ops.aggregates.totalHours)}
            icon={Clock01Icon}
            tone="amber"
          />
          <OperationsStatCard
            label="Visits in Planning"
            value={ops.aggregates.totalPlannedVisits}
            icon={Calendar03Icon}
            tone="violet"
          />
          <OperationsStatCard
            label="Reps to Publish"
            value={ops.aggregates.repsToPublish}
            icon={HourglassIcon}
            tone="red"
          />
          <OperationsStatCard
            label="Fully Published"
            value={ops.aggregates.repsFullyPublished}
            icon={CheckmarkCircle02Icon}
            tone="green"
          />
        </div>
      )}

      {hasItineraries && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => ops.setSelectionMode(!ops.selectionMode)}
          >
            <HugeiconsIcon
              icon={ops.selectionMode ? Cancel01Icon : Tick02Icon}
              aria-hidden="true"
              data-icon="inline-start"
            />
            {ops.selectionMode ? "Cancel selection" : "Select to publish"}
          </Button>
          {ops.selectionMode && (
            <>
              <Button
                type="button"
                disabled={ops.selectedUserIds.size === 0 || ops.isPublishing}
                onClick={ops.publish}
              >
                <HugeiconsIcon icon={Upload01Icon} aria-hidden="true" data-icon="inline-start" />
                {ops.isPublishing
                  ? "Publishing…"
                  : `Publish selected (${ops.selectedUserIds.size})`}
              </Button>
              <span className="text-sm text-muted-foreground">
                Tick reps that still have visits in planning, then publish.
              </span>
            </>
          )}
        </div>
      )}

      {!ops.searched ? (
        <EmptyState
          icon={PuzzleIcon}
          title="Search for itineraries"
          description="Choose a cycle (and optional province / reps filter), then search."
        />
      ) : ops.isLoading ? (
        <LoadingState label="Loading itineraries…" />
      ) : ops.reportError ? (
        <ErrorState error={ops.reportError} onRetry={ops.search} />
      ) : !rows.length ? (
        <EmptyState
          icon={InboxIcon}
          title="No reps found"
          description="No reps found. Pick a cycle and click Search."
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {ops.selectionMode && (
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={
                          ops.publishableCount > 0 &&
                          ops.selectedUserIds.size === ops.publishableCount
                        }
                        onChange={ops.toggleAllPublishable}
                        aria-label="Select all publishable reps"
                      />
                    </TableHead>
                  )}
                  <TableHead>User</TableHead>
                  <TableHead>Rep no.</TableHead>
                  <TableHead>Max Hours</TableHead>
                  {Array.from({ length: weekCount }, (_, i) => (
                    <TableHead key={i}>Week {i + 1}</TableHead>
                  ))}
                  <TableHead>Total hours</TableHead>
                  <TableHead>Visits in planning</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRows.map((row) => {
                  const canSelect = row.count_planned > 0;
                  return (
                    <TableRow
                      key={row.user.id}
                      className={cn(
                        "cursor-pointer",
                        ops.selectionMode && !canSelect && "opacity-50",
                      )}
                      onClick={() => {
                        if (ops.selectionMode) {
                          if (canSelect) ops.toggleUser(row.user.id);
                          return;
                        }
                        ops.openDetail(row);
                      }}
                    >
                      {ops.selectionMode && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            disabled={!canSelect}
                            checked={ops.selectedUserIds.has(row.user.id)}
                            onChange={() => ops.toggleUser(row.user.id)}
                            aria-label={`Select ${formatUserName(row.user)}`}
                          />
                        </TableCell>
                      )}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <UserAvatar user={row.user} size={32} />
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.user.rep_no ?? ""}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.user.max_hours ? (
                          row.user.max_hours
                        ) : (
                          <span
                            title="Maximum hours have not been recorded for this rep"
                            className="inline-flex"
                          >
                            <HugeiconsIcon
                              icon={HelpCircleIcon}
                              aria-label="Maximum hours have not been recorded for this rep"
                              className="size-4 text-muted-foreground/60"
                            />
                          </span>
                        )}
                      </TableCell>
                      <WeekCells row={row} weekCount={weekCount} />
                      <TableCell className="tabular-nums">
                        {(row.minutes / 60).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums",
                            canSelect
                              ? "bg-red-100 text-red-700"
                              : "bg-primary/10 text-primary",
                          )}
                          title={
                            canSelect
                              ? "Some visits remain to be published for this rep"
                              : "All visits have been published for this rep"
                          }
                        >
                          <HugeiconsIcon
                            icon={canSelect ? Alert02Icon : CheckmarkCircle02Icon}
                            aria-hidden="true"
                            className="size-3.5"
                          />
                          {row.count_planned}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          title="View itinerary"
                          aria-label="View itinerary"
                          onClick={() => ops.openDetail(row)}
                        >
                          <HugeiconsIcon icon={ClipboardIcon} aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Items per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPageIndex(0);
                }}
              >
                <SelectTrigger size="sm" aria-label="Items per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span>
                {rows.length === 0
                  ? "0 of 0"
                  : `${safePageIndex * pageSize + 1} – ${Math.min(
                      (safePageIndex + 1) * pageSize,
                      rows.length,
                    )} of ${rows.length}`}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePageIndex === 0}
                onClick={() => setPageIndex(safePageIndex - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePageIndex + 1 >= pageCount}
                onClick={() => setPageIndex(safePageIndex + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
