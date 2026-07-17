"use client";

import { useState } from "react";
import { JobsListToolbar } from "@/features/jobs/components/jobs-list-toolbar";
import { JobsTable } from "@/features/jobs/components/jobs-table";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { PageHeader } from "@/shared/components/page-header";
import { PAGE_SIZE_OPTIONS, useArchivesMasterDetail } from "../hooks";
import { ArchivesDetail } from "./archives-detail";

/** Archives page master/detail shell — past visits, filters, downloads. */
export function ArchivesView() {
  const controller = useArchivesMasterDetail();
  const [searchInput, setSearchInput] = useState("");

  if (controller.selectedJobId !== null) {
    if (controller.detail) {
      return (
        <ArchivesDetail
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
    <div className="space-y-4" data-testid="archives-page">
      <PageHeader title="Archives" description="Your past visits." />

      <JobsListToolbar
        view="archived"
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearch={() => controller.applySearch(searchInput.trim())}
        onRefresh={() => void controller.refetchList()}
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
        <ErrorState error={controller.listError} onRetry={() => void controller.refetchList()} />
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
          showStatus={false}
        />
      )}
    </div>
  );
}
