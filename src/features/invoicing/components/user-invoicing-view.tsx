"use client";

import {
  Calendar03Icon,
  Cancel01Icon,
  Cash01Icon,
  Clock01Icon,
  Delete02Icon,
  Download01Icon,
  FileDownloadIcon,
  PlayIcon,
  ReceiptTextIcon,
  Search01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useState } from "react";
import { toast } from "sonner";
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
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { cn } from "@/shared/lib/utils";
import { downloadLegacySummary, fetchAllUserInvoices, runUserInvoices } from "../api";
import type { ListableUser, ListableUserInvoice } from "../schemas";
import { UserInvoicingRunDialog, type RunDialogResult } from "./user-invoicing-run-dialog";
import {
  UserInvoicingSearchDialog,
  type SearchDialogResult,
} from "./user-invoicing-search-dialog";

type StatTone = "blue" | "violet" | "amber" | "teal" | "green";

const STAT_TONES: Record<StatTone, string> = {
  blue: "bg-primary/12 text-primary",
  violet: "bg-violet-500/12 text-violet-600 dark:text-violet-300",
  amber: "bg-amber-500/14 text-amber-600 dark:text-amber-300",
  teal: "bg-teal-500/12 text-teal-600 dark:text-teal-300",
  green: "bg-green-600/12 text-green-600 dark:text-green-400",
};

function formatMinutes(minutes: number | null | undefined): string {
  if (!minutes) return "0.00h";
  return `${(minutes / 60).toFixed(2)}h`;
}

function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return `$${Number(value).toFixed(2)}`;
}

function repLabel(user: ListableUser): string {
  const id = user.rep_no ? `REP${user.rep_no}` : `@${user.username}`;
  return `${user.first_name} ${user.last_name} (${id})`;
}

export function UserInvoicingView() {
  const [invoices, setInvoices] = useState<ListableUserInvoice[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState(0);
  const [filter, setFilter] = useState("");
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ListableUserInvoice | null>(null);

  const filtered = invoices.filter((inv) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    const repId = inv.user?.rep_no || inv.user?.username || "";
    return [
      inv.id,
      inv.batch_id,
      inv.billing_date,
      inv.period_end,
      inv.user?.first_name,
      inv.user?.last_name,
      repId,
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const stats = {
    total: invoices.length,
    reps: new Set(invoices.map((i) => i.user?.id)).size,
    visits: invoices.reduce((s, i) => s + Number(i.count_job_reports ?? 0), 0),
    hours: invoices.reduce((s, i) => s + Number(i.total_minutes ?? 0), 0) / 60,
    billed: invoices.reduce((s, i) => s + Number(i.total ?? 0), 0),
  };

  const handleRun = async (result: RunDialogResult) => {
    setInvoices([]);
    setErrors([]);
    setIsRunning(true);
    let count = 0;

    for (const user of result.users) {
      const id = user.rep_no ? `REP${user.rep_no}` : `@${user.username}`;
      setProgressLabel(`Running invoicing for ${user.first_name} ${user.last_name} (${id})…`);
      try {
        const response = await runUserInvoices({
          batch_id: result.batchId,
          billing_date: result.billingDate,
          period_end: result.periodEnd,
          customer_to_invoice: result.customerId,
          users: [user.id],
        });
        if (response.user_invoices.length > 0) {
          setInvoices((prev) => [...prev, ...response.user_invoices]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setErrors((prev) => [...prev, msg]);
      }
      count++;
      setProgressPct(Math.round((count / result.users.length) * 100));
    }

    setProgressLabel(null);
    setIsRunning(false);
    toast.success(`Finished running user invoicing.`);
  };

  const handleSearch = async (result: SearchDialogResult) => {
    setProgressLabel("Searching for user invoices…");
    setInvoices([]);
    try {
      const found = await fetchAllUserInvoices({
        batchIds: result.batchIds.length ? result.batchIds : undefined,
        billingDate: result.billingDate || undefined,
      });
      setInvoices(found);
      toast.success(`Found ${found.length} user invoices.`);
    } catch {
      toast.error("Failed to search user invoices.");
    } finally {
      setProgressLabel(null);
    }
  };

  const handleDownloadLegacySummary = async () => {
    const ids = invoices.map((i) => i.id);
    if (ids.length === 0) return;
    setProgressLabel("Requesting legacy summary…");
    try {
      await downloadLegacySummary(ids);
    } catch {
      toast.error("Failed to download legacy summary.");
    } finally {
      setProgressLabel(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { deleteUserInvoice } = await import("../api");
    try {
      await deleteUserInvoice(deleteTarget.id);
      setInvoices((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      toast.success("User invoice deleted.");
    } catch {
      toast.error("Failed to delete user invoice.");
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Invoicing"
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowRunDialog(true)} disabled={isRunning}>
              <HugeiconsIcon icon={PlayIcon} aria-hidden className="size-4" />
              Run
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSearchDialog(true)}
              disabled={isRunning}
            >
              <HugeiconsIcon icon={Search01Icon} aria-hidden className="size-4" />
              Search
            </Button>
            {invoices.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadLegacySummary}
                disabled={!!progressLabel}
              >
                <HugeiconsIcon icon={Download01Icon} aria-hidden className="size-4" />
                Legacy Summary
              </Button>
            )}
          </div>
        }
      />

      {/* Progress */}
      {progressLabel && (
        <div className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-3">
          <p className="text-sm">{progressLabel}</p>
          {isRunning && (
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-1 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-destructive">
              {e}
            </p>
          ))}
        </div>
      )}

      {invoices.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(
              [
                {
                  label: "Invoices",
                  value: stats.total,
                  icon: ReceiptTextIcon,
                  tone: "blue",
                },
                {
                  label: "Reps",
                  value: stats.reps,
                  icon: UserGroupIcon,
                  tone: "violet",
                },
                {
                  label: "Visits",
                  value: stats.visits,
                  icon: Calendar03Icon,
                  tone: "teal",
                },
                {
                  label: "Hours",
                  value: `${stats.hours.toFixed(1)}h`,
                  icon: Clock01Icon,
                  tone: "amber",
                },
                {
                  label: "Total Billed",
                  value: formatCurrency(stats.billed),
                  icon: Cash01Icon,
                  tone: "green",
                },
              ] as const satisfies ReadonlyArray<{
                label: string;
                value: string | number;
                icon: IconSvgElement;
                tone: StatTone;
              }>
            ).map((stat) => (
              <Card
                key={stat.label}
                className="shadow-[0_2px_8px_rgba(17,24,39,0.06)]"
              >
                <CardContent className="flex items-center gap-3 px-4 py-3.5">
                  <span
                    className={cn(
                      "inline-flex size-[42px] shrink-0 items-center justify-center rounded-xl",
                      STAT_TONES[stat.tone],
                    )}
                  >
                    <HugeiconsIcon
                      icon={stat.icon}
                      aria-hidden
                      className="size-[22px]"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                      {stat.label}
                    </span>
                    <span className="block truncate text-xl font-bold tracking-tight tabular-nums text-foreground">
                      {stat.value}
                    </span>
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-56">
              <HugeiconsIcon
                icon={Search01Icon}
                aria-hidden
                className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter results…"
                className="h-8 pl-8"
              />
              {filter && (
                <button
                  type="button"
                  onClick={() => setFilter("")}
                  className="absolute top-1/2 right-2 -translate-y-1/2"
                >
                  <HugeiconsIcon
                    icon={Cancel01Icon}
                    className="size-3.5 text-muted-foreground"
                  />
                </button>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setInvoices([]);
                setErrors([]);
                setFilter("");
              }}
            >
              Clear
            </Button>
          </div>
        </>
      )}

      {/* Table */}
      {invoices.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Batch ID</TableHead>
                <TableHead>Billing date</TableHead>
                <TableHead>Period end</TableHead>
                <TableHead>Rep</TableHead>
                <TableHead>Visits</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Taxes</TableHead>
                <TableHead>Total</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs">{inv.id}</TableCell>
                  <TableCell className="font-mono text-xs">{inv.batch_id}</TableCell>
                  <TableCell className="text-xs">{inv.billing_date}</TableCell>
                  <TableCell className="text-xs">{inv.period_end ?? "—"}</TableCell>
                  <TableCell className="text-xs">{repLabel(inv.user)}</TableCell>
                  <TableCell className="text-right text-xs">
                    {inv.count_job_reports ?? 0}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {formatMinutes(inv.total_minutes)}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {formatCurrency(inv.subtotal)}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {formatCurrency(inv.taxes)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold">
                    {formatCurrency(inv.total)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {inv.file_location && (
                        <a
                          href={inv.file_location}
                          target="_blank"
                          rel="noreferrer"
                          title="Download invoice"
                          className="rounded p-1 hover:bg-muted"
                        >
                          <HugeiconsIcon icon={FileDownloadIcon} className="size-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => setDeleteTarget(inv)}
                        className="rounded p-1 text-destructive hover:bg-muted"
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : !progressLabel && !isRunning ? (
        <EmptyState
          title="No invoices loaded"
          description="Run invoicing for a batch or search for existing invoices to get started."
          className="min-h-64"
        />
      ) : null}

      <UserInvoicingRunDialog
        open={showRunDialog}
        onOpenChange={setShowRunDialog}
        onRun={handleRun}
      />

      <UserInvoicingSearchDialog
        open={showSearchDialog}
        onOpenChange={setShowSearchDialog}
        onSearch={handleSearch}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete User Invoice"
        question={`Delete User Invoice #${deleteTarget?.id} for ${deleteTarget?.user?.first_name} ${deleteTarget?.user?.last_name}? This cannot be undone.`}
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
