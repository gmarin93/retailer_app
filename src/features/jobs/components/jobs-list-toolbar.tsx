"use client";

import {
  Add01Icon,
  Calendar03Icon,
  Cancel01Icon,
  CancelCircleIcon,
  CheckmarkSquare02Icon,
  Download01Icon,
  InformationCircleIcon,
  PreferenceHorizontalIcon,
  RestoreBinIcon,
  Search01Icon,
  SquareIcon,
  UserIcon,
  Wrench01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useState, type ReactNode } from "react";
import { useSession } from "@/features/auth/hooks";
import {
  canBulkCancelJobs,
  canBulkEditJobs,
  canBulkExtendJobs,
  canBulkReassignJobs,
  canBulkReinstateJobs,
  canDownloadJobs,
  canReviewJobs,
} from "@/features/auth/permissions";
import { UserRole } from "@/features/auth/types";
import { Input } from "@/shared/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";
import type { JobsQuery, JobsView } from "../api";
import { hasActiveJobsFilter, type JobsFilterFields } from "../filters";
import {
  BulkCancelDialog,
  BulkExtendDialog,
  BulkReassignDialog,
  BulkReinstateDialog,
} from "./jobs-bulk-dialogs";
import { JobsDownloadDialog } from "./jobs-download-dialog";
import { JobsEditDialog } from "./jobs-edit-dialog";
import { JobsFilterPanel } from "./jobs-filter-panel";

type DownloadScope = "filter" | "selection";

/**
 * Shared search / filter / bulk-action chrome for itinerary, review, archives.
 * Visual twin of Angular `jobs-search` toolbar card.
 */
export function JobsListToolbar({
  view,
  title,
  infoTooltip,
  searchInput,
  onSearchInputChange,
  onSearch,
  filter,
  onFilterChange,
  selectionMode,
  onSelectionModeChange,
  selectedIds,
  onClearSelection,
  filterQuery,
  onBulkDone,
  showClearRouteFilters,
  onClearRouteFilters,
}: {
  view: JobsView;
  /** Optional page title rendered above the toolbar (Angular jobs-search). */
  title?: string;
  infoTooltip?: string;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  /** Kept for API compatibility; refresh lives in the filter panel / list. */
  onRefresh?: () => void;
  filter: JobsFilterFields;
  onFilterChange: (next: JobsFilterFields) => void;
  selectionMode: boolean;
  onSelectionModeChange: (on: boolean) => void;
  selectedIds: number[];
  onClearSelection: () => void;
  filterQuery: Omit<JobsQuery, "page" | "pageSize" | "order">;
  onBulkDone: () => void;
  showClearRouteFilters?: boolean;
  onClearRouteFilters?: () => void;
}) {
  const session = useSession();
  const role = session?.user.role ?? UserRole.FIELD_REP;
  const [filterOpen, setFilterOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [downloadScope, setDownloadScope] = useState<DownloadScope>("filter");
  const [editOpen, setEditOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reinstateOpen, setReinstateOpen] = useState(false);

  const hasSelection = selectedIds.length > 0;
  const filtersActive = hasActiveJobsFilter(filter);
  const showQuick = canReviewJobs(role);
  const canDownload = canDownloadJobs(role);

  const afterBulk = () => {
    onClearSelection();
    onBulkDone();
  };

  const openDownload = (scope: DownloadScope) => {
    setDownloadScope(scope);
    setDownloadOpen(true);
  };

  return (
    <>
      {title && (
        <div className="mb-3 flex shrink-0 flex-row items-center gap-3">
          <h1 className="m-0 text-xl font-semibold text-foreground md:text-[20px]">{title}</h1>
          {infoTooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex text-[#4c6fff] hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/35"
                  aria-label={infoTooltip}
                >
                  <HugeiconsIcon icon={InformationCircleIcon} size={20} strokeWidth={1.8} />
                </button>
              </TooltipTrigger>
              <TooltipContent>{infoTooltip}</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-[14px] border border-slate-900/[0.06] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:border-border dark:bg-card">
        <div className="flex flex-row flex-wrap items-center gap-3 px-3 py-2.5 md:px-5 md:py-3">
          {/* Search */}
          <div className="relative order-first w-full min-w-0 flex-shrink-0 md:w-[400px] md:max-w-[400px]">
            <button
              type="button"
              onClick={onSearch}
              aria-label="Search"
              title="Search"
              className="absolute top-1/2 left-2 z-[1] inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-900/5 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/35"
            >
              <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.8} />
            </button>
            <Input
              value={searchInput}
              onChange={(event) => onSearchInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSearch();
              }}
              placeholder="Search"
              aria-label="Search visits"
              className="h-11 w-full rounded-full border-slate-900/10 bg-[#f8fafc] pr-9 pl-10 text-[15px] text-slate-900 placeholder:text-slate-900/55 focus-visible:border-[#4c6fff] focus-visible:ring-[#4c6fff]/20 dark:bg-background dark:text-foreground"
              data-testid="jobs-search"
            />
            {searchInput && (
              <button
                type="button"
                aria-label="Clear search"
                title="Clear search"
                onClick={() => {
                  onSearchInputChange("");
                  onSearch();
                }}
                className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-900/5 hover:text-slate-800 focus-visible:outline-none"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.8} />
              </button>
            )}
          </div>

          <div className="hidden flex-1 md:block" />

          {/* Bulk actions — Angular shows these once rows are selected */}
          {hasSelection && (
            <>
              {canBulkEditJobs(role) && (
                <ToolbarStrokedButton
                  icon={Wrench01Icon}
                  label="Edit"
                  onClick={() => setEditOpen(true)}
                />
              )}
              {canBulkExtendJobs(role) && (
                <ToolbarStrokedButton
                  icon={Calendar03Icon}
                  label="Change visit"
                  onClick={() => setExtendOpen(true)}
                />
              )}
              {canBulkReassignJobs(role) && (
                <ToolbarStrokedButton
                  icon={UserIcon}
                  label="Reassign"
                  onClick={() => setReassignOpen(true)}
                />
              )}
              {canBulkCancelJobs(role) && (
                <ToolbarStrokedButton
                  icon={CancelCircleIcon}
                  label="Cancel"
                  destructive
                  onClick={() => setCancelOpen(true)}
                />
              )}
              {canBulkReinstateJobs(role) && (
                <ToolbarStrokedButton
                  icon={RestoreBinIcon}
                  label="Reinstate"
                  onClick={() => setReinstateOpen(true)}
                />
              )}
            </>
          )}

          {canDownload && (
            <ToolbarLinkAction
              icon={Download01Icon}
              label="Download"
              onClick={() => openDownload("filter")}
              testId="jobs-download"
            />
          )}

          {canDownload && hasSelection && (
            <button
              type="button"
              onClick={() => openDownload("selection")}
              className="inline-flex h-8 items-center gap-1.5 self-center rounded-full bg-[rgba(76,111,255,0.08)] px-3 text-[13px] font-medium text-[#4c6fff] transition hover:bg-[rgba(76,111,255,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/35"
            >
              <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.8} />
              <span>Download Selected only</span>
            </button>
          )}

          <button
            type="button"
            data-testid="jobs-select-toggle"
            onClick={() => {
              onSelectionModeChange(!selectionMode);
              if (selectionMode) onClearSelection();
            }}
            className={cn(
              "inline-flex h-11 items-center gap-1.5 px-1.5 text-[15px] font-medium text-[#4c6fff] transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/35",
              selectionMode && "font-semibold",
            )}
          >
            <HugeiconsIcon
              icon={selectionMode ? CheckmarkSquare02Icon : SquareIcon}
              size={18}
              strokeWidth={1.8}
              className={cn(
                selectionMode ? "text-[#4c6fff]" : "text-slate-900/55",
              )}
            />
            <span>Select visit</span>
          </button>

          <button
            type="button"
            data-testid="jobs-filter-open"
            onClick={() => setFilterOpen(true)}
            className={cn(
              "inline-flex h-11 items-center gap-1.5 rounded-lg border border-slate-900/18 px-3.5 text-[15px] font-medium text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/35 dark:border-border dark:text-foreground dark:hover:bg-muted",
              (filterOpen || filtersActive) &&
                "border-[#4c6fff] bg-[#e8eaf6] text-[#4c6fff] dark:bg-[#1e2540]",
            )}
          >
            <HugeiconsIcon icon={PreferenceHorizontalIcon} size={18} strokeWidth={1.8} />
            <span>Filters</span>
            {filtersActive && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4c6fff] px-1.5 text-[11px] font-bold text-white">
                •
              </span>
            )}
          </button>
        </div>

        {showQuick && (
          <div className="flex flex-row flex-wrap items-center gap-2 border-t border-slate-900/[0.05] px-3 pt-0 pb-2.5 md:px-5 md:pb-3 dark:border-border">
            <span className="mr-1 text-xs font-semibold tracking-[0.04em] text-slate-900/45 uppercase dark:text-muted-foreground">
              Quick:
            </span>
            <QuickPill
              active={Boolean(filter.unassigned)}
              onClick={() =>
                onFilterChange({
                  ...filter,
                  unassigned: !filter.unassigned,
                  assignees: [],
                })
              }
            >
              Unassigned
            </QuickPill>
            <QuickPill
              active={Boolean(filter.overdue)}
              onClick={() => onFilterChange({ ...filter, overdue: !filter.overdue })}
            >
              Overdue
            </QuickPill>
            <QuickPill
              active={Boolean(filter.noStatusCode)}
              onClick={() =>
                onFilterChange({
                  ...filter,
                  noStatusCode: !filter.noStatusCode,
                  statusCodes: [],
                })
              }
            >
              No status code
            </QuickPill>
          </div>
        )}
      </div>

      {showClearRouteFilters && onClearRouteFilters && (
        <button
          type="button"
          onClick={onClearRouteFilters}
          className="mt-2 text-[13px] font-semibold text-[#d73a49] hover:underline focus-visible:outline-none"
        >
          Clear all
        </button>
      )}

      <JobsFilterPanel
        open={filterOpen}
        onOpenChange={setFilterOpen}
        value={filter}
        onApply={onFilterChange}
        showAssignees={canReviewJobs(role)}
      />

      <JobsDownloadDialog
        key={`download-${downloadScope}`}
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        view={view}
        filterQuery={filterQuery}
        selectedIds={selectedIds}
        defaultScope={downloadScope}
      />

      <JobsEditDialog
        jobIds={selectedIds}
        open={editOpen}
        onOpenChange={setEditOpen}
        onDone={afterBulk}
      />
      <BulkExtendDialog
        jobIds={selectedIds}
        open={extendOpen}
        onOpenChange={setExtendOpen}
        onDone={afterBulk}
      />
      <BulkReassignDialog
        jobIds={selectedIds}
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        onDone={afterBulk}
      />
      <BulkCancelDialog
        jobIds={selectedIds}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onDone={afterBulk}
      />
      <BulkReinstateDialog
        jobIds={selectedIds}
        open={reinstateOpen}
        onOpenChange={setReinstateOpen}
        onDone={afterBulk}
      />
    </>
  );
}

function ToolbarStrokedButton({
  icon,
  label,
  onClick,
  destructive = false,
}: {
  icon: IconSvgElement;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-[38px] items-center gap-1 rounded-[10px] border bg-white px-3.5 text-[13px] font-semibold tracking-wide uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/35 dark:bg-transparent",
        destructive
          ? "border-[#e85a3a]/45 text-[#e85a3a] hover:bg-[#e85a3a]/06"
          : "border-[#4c6fff]/35 text-[#4c6fff] hover:bg-[rgba(76,111,255,0.06)]",
      )}
    >
      <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} />
      <span>{label}</span>
    </button>
  );
}

function ToolbarLinkAction({
  icon,
  label,
  onClick,
  testId,
}: {
  icon: IconSvgElement;
  label: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="inline-flex h-11 items-center gap-1.5 px-1.5 text-[15px] font-medium text-[#4c6fff] transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/35"
    >
      <HugeiconsIcon icon={icon} size={18} strokeWidth={1.8} />
      <span className="normal-case">{label}</span>
    </button>
  );
}

function QuickPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-[34px] items-center rounded-full border px-3.5 text-[13px] font-semibold whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/35",
        active
          ? "border-[#4c6fff] bg-[rgba(76,111,255,0.12)] text-[#4c6fff] shadow-[inset_0_0_0_1px_rgba(76,111,255,0.08)]"
          : "border-slate-900/12 bg-[#f8fafc] text-slate-900/72 hover:border-[rgba(76,111,255,0.45)] hover:text-[#4c6fff] dark:border-border dark:bg-muted dark:text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
