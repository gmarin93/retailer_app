"use client";

import { useState } from "react";
import { JobsListToolbar } from "@/features/jobs/components/jobs-list-toolbar";
import { JobsTable } from "@/features/jobs/components/jobs-table";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import {
  TooltipProvider,
} from "@/shared/components/ui/tooltip";
import { PAGE_SIZE_OPTIONS, useItineraryMasterDetail } from "../hooks";
import { ItineraryDetail } from "./itinerary-detail";

/**
 * Itinerary page master/detail shell — the rep's visit list with search,
 * filters, bulk actions, server-side sort/pagination, and visit detail.
 */
export function ItineraryView() {
  const controller = useItineraryMasterDetail();
  const [searchInput, setSearchInput] = useState("");

  if (controller.selectedJobId !== null) {
    if (controller.detail) {
      return (
        <ItineraryDetail
          job={controller.detail}
          onClose={controller.closeDetail}
          onPrevious={controller.viewPreviousJob}
          onNext={controller.viewNextJob}
        />
      );
    }
    if (controller.detailError) {
      return <ErrorState error={controller.detailError} onRetry={controller.closeDetail} />;
    }
    return <LoadingState label="Loading visit…" className="min-h-[60vh]" />;
  }

  return (
    <TooltipProvider>
      <div
        className="-mx-3 -mt-1 flex min-h-0 flex-col gap-3 bg-[#f5f7fa] px-3 py-3 sm:-mx-6 sm:px-6 sm:py-5 md:-mx-8 md:px-8 dark:bg-background"
        data-testid="itinerary-page"
      >
        <JobsListToolbar
          view="default"
          title="Itinerary"
          infoTooltip="Itinerary overview"
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onSearch={() => controller.applySearch(searchInput.trim())}
          filter={controller.filter}
          onFilterChange={controller.applyFilter}
          selectionMode={controller.selectionMode}
          onSelectionModeChange={controller.setSelectionMode}
          selectedIds={[...controller.selectedIds]}
          onClearSelection={controller.clearSelection}
          filterQuery={controller.filterQuery}
          onBulkDone={() => void controller.refetchList()}
        />

        {controller.listError ? (
          <ErrorState
            error={controller.listError}
            onRetry={() => void controller.refetchList()}
          />
        ) : (
          <JobsTable
            page={controller.page}
            isLoading={controller.isListLoading}
            sort={controller.sort}
            onSortChange={controller.setSort}
            pageIndex={controller.pageIndex}
            pageSize={controller.pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={controller.setPage}
            onRowClick={controller.openJob}
            selectionMode={controller.selectionMode}
            selectedIds={controller.selectedIds}
            onToggleSelect={controller.toggleSelect}
            onToggleSelectAll={controller.toggleSelectAll}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
