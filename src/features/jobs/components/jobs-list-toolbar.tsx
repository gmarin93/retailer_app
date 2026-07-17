"use client";

import {
  Cancel01Icon,
  Download01Icon,
  FilterIcon,
  RefreshIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
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
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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

/**
 * Shared search / filter / bulk-action chrome for itinerary, review, archives.
 */
export function JobsListToolbar({
  view,
  searchInput,
  onSearchInputChange,
  onSearch,
  onRefresh,
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
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearch: () => void;
  onRefresh: () => void;
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
  const [editOpen, setEditOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reinstateOpen, setReinstateOpen] = useState(false);

  const hasSelection = selectedIds.length > 0;
  const filtersActive = hasActiveJobsFilter(filter);

  const afterBulk = () => {
    onClearSelection();
    onBulkDone();
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <HugeiconsIcon
            icon={Search01Icon}
            aria-hidden="true"
            className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSearch();
            }}
            placeholder="Search"
            aria-label="Search visits"
            className="w-64 pl-8"
            data-testid="jobs-search"
          />
          {searchInput && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                onSearchInputChange("");
                onSearch();
              }}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onSearch}>
          Search
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(filtersActive && "border-primary text-primary")}
          onClick={() => setFilterOpen(true)}
          data-testid="jobs-filter-open"
        >
          <HugeiconsIcon icon={FilterIcon} className="size-3.5" data-icon="inline-start" />
          Filters{filtersActive ? " · on" : ""}
        </Button>

        {canReviewJobs(role) && (
          <>
            <Button
              type="button"
              size="sm"
              variant={filter.overdue ? "default" : "outline"}
              onClick={() => onFilterChange({ ...filter, overdue: !filter.overdue })}
            >
              Overdue
            </Button>
            <Button
              type="button"
              size="sm"
              variant={filter.unassigned ? "default" : "outline"}
              onClick={() =>
                onFilterChange({
                  ...filter,
                  unassigned: !filter.unassigned,
                  assignees: [],
                })
              }
            >
              Unassigned
            </Button>
          </>
        )}

        {showClearRouteFilters && onClearRouteFilters && (
          <Button variant="ghost" size="sm" onClick={onClearRouteFilters}>
            Clear filters
          </Button>
        )}

        <div className="flex-1" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onSelectionModeChange(!selectionMode);
            if (selectionMode) onClearSelection();
          }}
          data-testid="jobs-select-toggle"
        >
          {selectionMode ? "Cancel selection" : "Select visit"}
        </Button>

        {selectionMode && hasSelection && (
          <>
            {canBulkEditJobs(role) && (
              <Button type="button" size="sm" onClick={() => setEditOpen(true)}>
                Edit ({selectedIds.length})
              </Button>
            )}
            {canBulkExtendJobs(role) && (
              <Button type="button" size="sm" variant="outline" onClick={() => setExtendOpen(true)}>
                Change visit
              </Button>
            )}
            {canBulkReassignJobs(role) && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setReassignOpen(true)}
              >
                Reassign
              </Button>
            )}
            {canBulkCancelJobs(role) && (
              <Button type="button" size="sm" variant="outline" onClick={() => setCancelOpen(true)}>
                Cancel
              </Button>
            )}
            {canBulkReinstateJobs(role) && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setReinstateOpen(true)}
              >
                Reinstate
              </Button>
            )}
          </>
        )}

        {canDownloadJobs(role) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDownloadOpen(true)}
            data-testid="jobs-download"
          >
            <HugeiconsIcon icon={Download01Icon} className="size-3.5" data-icon="inline-start" />
            Download
            {hasSelection ? " selected" : ""}
          </Button>
        )}

        <Button variant="ghost" size="icon" aria-label="Refresh visits" onClick={onRefresh}>
          <HugeiconsIcon icon={RefreshIcon} aria-hidden="true" className="size-4" />
        </Button>
      </div>

      <JobsFilterPanel
        open={filterOpen}
        onOpenChange={setFilterOpen}
        value={filter}
        onApply={onFilterChange}
        showAssignees={canReviewJobs(role)}
      />

      <JobsDownloadDialog
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        view={view}
        filterQuery={filterQuery}
        selectedIds={selectedIds}
        defaultScope={hasSelection ? "selection" : "filter"}
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
