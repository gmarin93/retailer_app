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
import { useMemo, useState } from "react";
import { useSession } from "@/features/auth/hooks";
import { isElevated } from "@/features/auth/permissions";
import { UserRole } from "@/features/auth/types";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
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
import { useCustomerInvoices, useVoidCustomerInvoice } from "../hooks";

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

export function CustomerInvoiceListView() {
  const session = useSession();
  const canVoid = isElevated(session?.user.role ?? UserRole.FIELD_REP);
  const query = useCustomerInvoices();
  const voidMutation = useVoidCustomerInvoice();
  const [search, setSearch] = useState("");
  const [voidTarget, setVoidTarget] = useState<ListableInvoice | null>(null);

  const invoices = useMemo(() => query.data ?? [], [query.data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices;
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) =>
      [inv.id, inv.customer?.title, inv.program?.title, inv.billing_date, inv.total]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [invoices, search]);

  const stats = {
    total: invoices.length,
    customers: new Set(invoices.map((i) => i.customer?.title)).size,
    visits: invoices.reduce((s, i) => s + Number(i.num_jobs ?? 0), 0),
    billed: invoices.filter((i) => !i.voided).reduce((s, i) => s + Number(i.total ?? 0), 0),
    voided: invoices.filter((i) => i.voided).length,
  };
  const hasInvoices = invoices.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Invoices"
          description="Browse, search, and export issued customer invoices."
        />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {hasInvoices ? (
            <>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {stats.total} invoice{stats.total === 1 ? "" : "s"}
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {formatCurrency(stats.billed)} billed
              </span>
              {stats.voided > 0 && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                  {stats.voided} voided
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

      {query.isLoading ? (
        <LoadingState label="Loading invoices…" className="min-h-60" />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <>
          {hasInvoices && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                {
                  label: "Invoices",
                  value: stats.total,
                  icon: ReceiptTextIcon,
                  tile: "bg-blue-100 text-blue-600",
                },
                {
                  label: "Customers",
                  value: stats.customers,
                  icon: Building01Icon,
                  tile: "bg-teal-100 text-teal-600",
                },
                {
                  label: "Visits",
                  value: stats.visits,
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
                  value: stats.voided,
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
                      </span>
                      <span className="block truncate text-lg font-semibold tabular-nums">
                        {stat.value}
                      </span>
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <HugeiconsIcon
                icon={Search01Icon}
                aria-hidden
                className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="pl-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
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
              onClick={() => downloadCsv(filtered)}
            >
              <HugeiconsIcon icon={Download01Icon} aria-hidden data-icon="inline-start" />
              Download
            </Button>
          </div>

          <Card>
            {hasInvoices && (
              <p className="px-4 pt-3 text-xs text-muted-foreground">
                Showing <strong>{filtered.length}</strong> of {invoices.length} invoice
                {invoices.length === 1 ? "" : "s"}
              </p>
            )}
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
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
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-10 text-center text-muted-foreground"
                      >
                        No invoices found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((inv) => (
                      <TableRow key={inv.id} className={cn(inv.voided && "opacity-60")}>
                        <TableCell className="tabular-nums">{inv.id}</TableCell>
                        <TableCell>{inv.customer?.title ?? "—"}</TableCell>
                        <TableCell>{inv.program?.title ?? "—"}</TableCell>
                        <TableCell className="tabular-nums">{inv.num_jobs ?? 0}</TableCell>
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
                                <a href={inv.location} download={inv.file_name ?? undefined}>
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
                    ))
                  )}
                </TableBody>
              </Table>
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
        onConfirm={() => {
          if (voidTarget) {
            voidMutation.mutate(voidTarget.id, { onSettled: () => setVoidTarget(null) });
          }
        }}
      />
    </div>
  );
}
