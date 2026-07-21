"use client";

import {
  Building01Icon,
  Calendar03Icon,
  Cancel01Icon,
  Cash01Icon,
  Download01Icon,
  FileDownloadIcon,
  MultiplicationSignCircleIcon,
  ReceiptTextIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "@/features/auth/hooks";
import { isElevated } from "@/features/auth/permissions";
import { UserRole } from "@/features/auth/types";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
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
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { PageHeader } from "@/shared/components/page-header";
import { cn } from "@/shared/lib/utils";
import type { ListableInvoice } from "../schemas";
import {
  useCustomerInvoicesAll,
  useCustomerInvoicesPage,
  useVoidCustomerInvoice,
} from "../hooks";

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const ROW_HEIGHT = 52;

function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function downloadCsv(rows: ListableInvoice[]) {
  const header = [
    "Invoice ID",
    "Customer",
    "Program",
    "Visits",
    "Billing Date",
    "Total",
    "Voided",
  ];
  const lines = rows.map((inv) =>
    [
      inv.id,
      inv.customer?.title ?? "",
      inv.program?.title ?? "",
      inv.num_jobs ?? 0,
      inv.billing_date ?? "",
      inv.total ?? 0,
      inv.voided ? "Yes" : "No",
    ].join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "customer-invoices.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function CustomerInvoiceListView() {
  const session = useSession();
  const canVoid = isElevated(session?.user.role ?? UserRole.FIELD_REP);
  const voidMutation = useVoidCustomerInvoice();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 300);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(50);
  const [voidTarget, setVoidTarget] = useState<ListableInvoice | null>(null);

  // Reset to first page when the server search term changes.
  useEffect(() => {
    setPageIndex(0);
  }, [search]);

  const pageQuery = useCustomerInvoicesPage({
    page: pageIndex + 1,
    pageSize,
    search: search.trim() || undefined,
  });
  const allQuery = useCustomerInvoicesAll();

  // Keep pulling stats/CSV pages until the full set is cached.
  useEffect(() => {
    if (allQuery.hasNextPage && !allQuery.isFetchingNextPage) {
      void allQuery.fetchNextPage();
    }
  }, [allQuery.hasNextPage, allQuery.isFetchingNextPage, allQuery.fetchNextPage]);

  const rows = pageQuery.data?.results ?? [];
  const totalCount = pageQuery.data?.count ?? allQuery.data?.pages[0]?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const allComplete = allQuery.isSuccess && !allQuery.hasNextPage;

  const allInvoices = useMemo(
    () => allQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [allQuery.data],
  );

  // Prefer progressive aggregates from the background fetch; fall back to the
  // visible table page so cards never sit on placeholders after first paint.
  const statsSource = allInvoices.length > 0 ? allInvoices : rows;

  const stats = useMemo(() => {
    if (statsSource.length === 0) {
      return {
        total: totalCount,
        customers: 0,
        visits: 0,
        billed: 0,
        voided: 0,
        partial: false,
      };
    }
    return {
      total: totalCount || statsSource.length,
      customers: new Set(statsSource.map((i) => i.customer?.title)).size,
      visits: statsSource.reduce((s, i) => s + Number(i.num_jobs ?? 0), 0),
      billed: statsSource
        .filter((i) => !i.voided)
        .reduce((s, i) => s + Number(i.total ?? 0), 0),
      voided: statsSource.filter((i) => i.voided).length,
      partial: !allComplete,
    };
  }, [statsSource, totalCount, allComplete]);

  const hasInvoices = totalCount > 0 || rows.length > 0;

  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  });
  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems[0]?.start ?? 0;
  const paddingBottom =
    virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0);

  const onPageChange = (nextIndex: number, nextSize: number) => {
    setPageSize(nextSize);
    setPageIndex(nextIndex);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const csvRows = useMemo(() => {
    if (!search.trim()) return allInvoices;
    const q = search.trim().toLowerCase();
    return allInvoices.filter((inv) =>
      [inv.id, inv.customer?.title, inv.program?.title, inv.billing_date, inv.total]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [allInvoices, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Invoices"
          description="Browse, search, and export issued customer invoices."
        />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {hasInvoices || pageQuery.isLoading ? (
            <>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {stats.total} invoice{stats.total === 1 ? "" : "s"}
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {formatCurrency(stats.billed)} billed
                {stats.partial ? "…" : ""}
              </span>
              {stats.voided > 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                  {stats.voided} voided
                  {stats.partial ? "…" : ""}
                </span>
              )}
            </>
          ) : (
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              No invoices
            </span>
          )}
        </div>
      </div>

      {pageQuery.isLoading && !pageQuery.data ? (
        <LoadingState label="Loading invoices…" className="min-h-60" />
      ) : pageQuery.isError ? (
        <ErrorState error={pageQuery.error} onRetry={() => pageQuery.refetch()} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                label: "Invoices",
                value: stats.total.toLocaleString(),
                icon: ReceiptTextIcon,
                tile: "bg-blue-100 text-blue-600",
              },
              {
                label: "Customers",
                value: stats.customers.toLocaleString(),
                icon: Building01Icon,
                tile: "bg-teal-100 text-teal-600",
              },
              {
                label: "Visits",
                value: stats.visits.toLocaleString(),
                icon: Calendar03Icon,
                tile: "bg-violet-100 text-violet-600",
              },
              {
                label: "Total Billed",
                value: formatCurrency(stats.billed),
                icon: Cash01Icon,
                tile: "bg-green-100 text-green-600",
              },
              {
                label: "Voided",
                value: stats.voided.toLocaleString(),
                icon: MultiplicationSignCircleIcon,
                tile: "bg-red-100 text-red-600",
              },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="flex items-center gap-3 pt-4">
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      stat.tile,
                    )}
                  >
                    <HugeiconsIcon icon={stat.icon} aria-hidden className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {stat.label}
                      {stats.partial && stat.label !== "Invoices" ? " (loading)" : ""}
                    </span>
                    <span className="block truncate text-lg font-semibold tabular-nums">
                      {stat.value}
                    </span>
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <HugeiconsIcon
                icon={Search01Icon}
                aria-hidden
                className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search"
                className="pl-8"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute top-1/2 right-2 -translate-y-1/2"
                  aria-label="Clear search"
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    className="size-3.5 text-muted-foreground"
                  />
                </button>
              )}
            </div>
            <div className="flex-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-primary"
              disabled={!allComplete || csvRows.length === 0}
              onClick={() => downloadCsv(csvRows)}
            >
              <HugeiconsIcon icon={Download01Icon} aria-hidden data-icon="inline-start" />
              {!allComplete ? "Preparing…" : "Download"}
            </Button>
          </div>

          <Card>
            <p className="px-4 pt-3 text-xs text-muted-foreground">
              Showing{" "}
              <strong>
                {rows.length === 0
                  ? 0
                  : `${pageIndex * pageSize + 1}–${pageIndex * pageSize + rows.length}`}
              </strong>{" "}
              of {totalCount.toLocaleString()} invoice{totalCount === 1 ? "" : "s"}
              {pageQuery.isFetching && pageQuery.isPlaceholderData ? " · Updating…" : ""}
            </p>
            <CardContent className="p-0">
              <div ref={scrollRef} className="max-h-[min(28rem,70vh)] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_var(--border)]">
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Visits</TableHead>
                      <TableHead>Billing Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Void</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-10 text-center text-muted-foreground"
                        >
                          No invoices found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {paddingTop > 0 && (
                          <tr aria-hidden>
                            <td
                              colSpan={8}
                              style={{ height: paddingTop, padding: 0, border: 0 }}
                            />
                          </tr>
                        )}
                        {virtualItems.map((item) => {
                          const inv = rows[item.index]!;
                          return (
                            <TableRow
                              key={inv.id}
                              data-index={item.index}
                              className={cn(inv.voided && "opacity-60")}
                            >
                              <TableCell className="tabular-nums">{inv.id}</TableCell>
                              <TableCell>{inv.customer?.title ?? "—"}</TableCell>
                              <TableCell>{inv.program?.title ?? "—"}</TableCell>
                              <TableCell className="tabular-nums">
                                {inv.num_jobs ?? 0}
                              </TableCell>
                              <TableCell className="tabular-nums">
                                {inv.billing_date ?? "—"}
                              </TableCell>
                              <TableCell className="font-semibold tabular-nums">
                                {formatCurrency(inv.total)}
                              </TableCell>
                              <TableCell>
                                {inv.voided && (
                                  <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                    Void
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {inv.location && (
                                    <Button
                                      asChild
                                      size="icon-sm"
                                      title="Download invoice"
                                      aria-label="Download invoice"
                                    >
                                      <a
                                        href={inv.location}
                                        download={inv.file_name ?? undefined}
                                      >
                                        <HugeiconsIcon icon={FileDownloadIcon} aria-hidden />
                                      </a>
                                    </Button>
                                  )}
                                  {canVoid && !inv.voided && (
                                    <Button
                                      type="button"
                                      size="icon-sm"
                                      variant="destructive"
                                      title="Void invoice"
                                      aria-label="Void invoice"
                                      disabled={voidMutation.isPending}
                                      onClick={() => setVoidTarget(inv)}
                                    >
                                      <HugeiconsIcon
                                        icon={MultiplicationSignCircleIcon}
                                        aria-hidden
                                      />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {paddingBottom > 0 && (
                          <tr aria-hidden>
                            <td
                              colSpan={8}
                              style={{ height: paddingBottom, padding: 0, border: 0 }}
                            />
                          </tr>
                        )}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
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
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm">
                    Page {Math.min(pageIndex + 1, pageCount)} of {pageCount}
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
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={voidTarget !== null}
        onOpenChange={(open) => {
          if (!open) setVoidTarget(null);
        }}
        title="Void Customer Invoice"
        question="Are you sure you want to VOID this invoice? WARNING: THIS ACTION IS IRRECOVERABLE."
        destructive
        isPending={voidMutation.isPending}
        confirmLabel={voidMutation.isPending ? "Voiding…" : "Yes"}
        onConfirm={() => {
          if (!voidTarget) return;
          voidMutation.mutate(voidTarget.id, { onSuccess: () => setVoidTarget(null) });
        }}
      />
    </div>
  );
}
