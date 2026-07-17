"use client";

import { format } from "date-fns";
import {
  BulbIcon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
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
import { EmptyState } from "@/shared/components/empty-state";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { cn } from "@/shared/lib/utils";
import { useCustomersByTitle } from "@/shared/services/entities/customers";
import { useCyclesByDate } from "@/shared/services/entities/cycles";
import type { CustomChargeLine, InvoiceableJobPage } from "../schemas";
import {
  CHARGE_TEMPLATES,
  DEFAULT_PROVINCE,
  PROVINCE_OPTIONS,
} from "../schemas";
import {
  fetchInvoiceableJobs,
  finalizeJobsInvoice,
  previewJobsInvoice,
  type InvoiceableJobsFilter,
  type JobsInvoicePayload,
} from "../api";

type StudioStep = "visits" | "configure" | "charges" | "finalize";

const STEPS: { id: StudioStep; number: number; label: string }[] = [
  { id: "visits", number: 1, label: "Choose visits" },
  { id: "configure", number: 2, label: "Configure" },
  { id: "charges", number: 3, label: "Extra charges" },
  { id: "finalize", number: 4, label: "Finalize" },
];

function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

export function CustomerInvoiceStudioView() {
  const customers = useCustomersByTitle();
  const cycles = useCyclesByDate();

  // Filter state for invoiceable jobs search
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterCycle, setFilterCycle] = useState("");

  // Active filter applied to the last search
  const [activeFilter, setActiveFilter] = useState<InvoiceableJobsFilter>({});
  const [jobPage, setJobPage] = useState<InvoiceableJobPage | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);

  // Configure step
  const [confirmCustomerId, setConfirmCustomerId] = useState("");
  const [billingDate, setBillingDate] = useState(todayISO());

  // Extra charges
  const [customLines, setCustomLines] = useState<CustomChargeLine[]>([]);

  // Finalize state
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [finalizedId, setFinalizedId] = useState<number | null>(null);
  const [finalizedLocation, setFinalizedLocation] = useState<string | null>(null);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  // Studio navigation
  const [activeStep, setActiveStep] = useState<StudioStep>("visits");
  const [showTips, setShowTips] = useState(false);

  const canFinalize =
    !!jobPage &&
    jobPage.count > 0 &&
    !!confirmCustomerId &&
    !!billingDate &&
    !progressLabel;

  const canPreview = canFinalize;

  const stepComplete = (step: StudioStep): boolean => {
    switch (step) {
      case "visits":
        return !!jobPage && jobPage.count > 0;
      case "configure":
        return !!confirmCustomerId && !!billingDate;
      case "charges":
        return customLines.length > 0;
      case "finalize":
        return canFinalize;
    }
  };

  const stepDetail = (step: StudioStep): string => {
    switch (step) {
      case "visits":
        return jobPage
          ? `${jobPage.count} invoiceable visit${jobPage.count === 1 ? "" : "s"}`
          : "Run a search to load visits";
      case "configure": {
        const cust = (customers.data ?? []).find((c) => String(c.id) === confirmCustomerId);
        if (cust && billingDate) return `${cust.title} · ${billingDate}`;
        if (cust) return cust.title;
        return "Confirm customer and billing date";
      }
      case "charges":
        return customLines.length > 0
          ? `${customLines.length} line${customLines.length === 1 ? "" : "s"} added`
          : "Optional — skip if none needed";
      case "finalize":
        return canFinalize ? "Ready to preview or finalize" : "Complete earlier steps first";
    }
  };

  const readinessCompleteCount = STEPS.filter((step) => stepComplete(step.id)).length;
  const visitCountLabel =
    jobPage == null
      ? "No search yet"
      : `${jobPage.count} visit${jobPage.count === 1 ? "" : "s"}`;
  const activeStepIndex = STEPS.findIndex((step) => step.id === activeStep);
  const canGoBack = activeStepIndex > 0;
  const canGoNext = activeStepIndex < STEPS.length - 1;

  const searchJobs = async (page = 0) => {
    const filter: InvoiceableJobsFilter = {
      customers: filterCustomer ? [Number(filterCustomer)] : undefined,
      cycles: filterCycle ? [Number(filterCycle)] : undefined,
      page,
      pageSize: 25,
    };
    setJobsLoading(true);
    setJobsError(null);
    try {
      const result = await fetchInvoiceableJobs(filter);
      setJobPage(result);
      setActiveFilter(filter);
      // Suggest the customer if the filter has exactly one
      if (filterCustomer && !confirmCustomerId) {
        setConfirmCustomerId(filterCustomer);
      }
    } catch (err) {
      setJobsError(err instanceof Error ? err.message : "Failed to load jobs.");
    } finally {
      setJobsLoading(false);
    }
  };

  const addCustomLine = () => {
    const province =
      customLines.length > 0 ? customLines[customLines.length - 1].province : DEFAULT_PROVINCE;
    setCustomLines((prev) => [
      ...prev,
      { name: `New line ${prev.length + 1}`, date: todayISO(), province, units: 1, rate: 0 },
    ]);
  };

  const removeCustomLine = (index: number) =>
    setCustomLines((prev) => prev.filter((_, i) => i !== index));

  const updateLine = (index: number, patch: Partial<CustomChargeLine>) =>
    setCustomLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const buildPayload = (): JobsInvoicePayload => ({
    customer: Number(confirmCustomerId),
    billing_date: billingDate,
    custom_lines: customLines,
  });

  const handlePreview = async () => {
    setProgressLabel("Requesting invoice preview…");
    setProgressError(null);
    try {
      await previewJobsInvoice(activeFilter, buildPayload());
    } catch (err) {
      setProgressError(err instanceof Error ? err.message : "Failed to generate preview.");
    } finally {
      setProgressLabel(null);
    }
  };

  const handleFinalize = async () => {
    setProgressLabel("Finalizing invoice…");
    setProgressError(null);
    try {
      const result = await finalizeJobsInvoice(activeFilter, buildPayload());
      setFinalizedId(result.id);
      setFinalizedLocation(result.location);
      toast.success(`Invoice #${result.id} finalized.`);
      void searchJobs();
    } catch (err) {
      setProgressError(err instanceof Error ? err.message : "Failed to finalize invoice.");
    } finally {
      setProgressLabel(null);
    }
  };

  const lineTotal = (line: CustomChargeLine) => (line.units * line.rate).toFixed(2);
  const customLinesTotal = customLines.reduce((s, l) => s + l.units * l.rate, 0);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Customer Invoice Studio</h1>
          <p className="text-sm text-muted-foreground">
            Build customer invoices on one screen with a live summary and smart suggestions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {readinessCompleteCount}/{STEPS.length} ready
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {visitCountLabel}
          </span>
          {customLines.length > 0 && (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {customLines.length} extra line{customLines.length === 1 ? "" : "s"}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTips((v) => !v)}
          >
            <HugeiconsIcon icon={BulbIcon} className="size-3.5" data-icon="inline-start" />
            Tips
          </Button>
        </div>
      </header>

      {showTips && (
        <section
          aria-label="Customer invoicing tips"
          className="grid gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground sm:grid-cols-2"
        >
          <span>Search visits first — the summary updates as you go.</span>
          <span>Confirm one customer so only their visits land on the invoice.</span>
          <span>Use quick charge templates for common add-on lines.</span>
          <span>Preview downloads a draft before you finalize.</span>
        </section>
      )}

      <div className="grid gap-0 overflow-hidden rounded-xl border bg-card lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4 p-5">
          <nav aria-label="Invoice steps" className="flex flex-wrap gap-2">
            {STEPS.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  activeStep === step.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40",
                  stepComplete(step.id) && activeStep !== step.id && "border-green-200",
                )}
              >
                {stepComplete(step.id) ? (
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    className="size-4 shrink-0 text-green-500"
                  />
                ) : (
                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                    {step.number}
                  </span>
                )}
                <span className="font-medium">{step.label}</span>
              </button>
            ))}
          </nav>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!canGoBack}
              onClick={() => setActiveStep(STEPS[activeStepIndex - 1]!.id)}
            >
              Back
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!canGoNext}
              onClick={() => setActiveStep(STEPS[activeStepIndex + 1]!.id)}
            >
              Next
            </Button>
          </div>

          <div>
        {/* ── STEP 1: Visits ── */}
        {activeStep === "visits" && (
          <div className="space-y-4">
            <h3 className="font-semibold">Search Invoiceable Visits</h3>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5 w-52">
                <Label>Customer</Label>
                <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    {(customers.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 w-52">
                <Label>Cycle</Label>
                <Select value={filterCycle} onValueChange={setFilterCycle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    {(cycles.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => searchJobs(0)} disabled={jobsLoading}>
                {jobsLoading ? "Searching…" : "Search"}
              </Button>
            </div>

            {jobsLoading ? (
              <LoadingState label="Loading invoiceable jobs…" className="min-h-40" />
            ) : jobsError ? (
              <ErrorState error={new Error(jobsError)} onRetry={() => searchJobs(0)} />
            ) : jobPage ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {jobPage.count} invoiceable visit{jobPage.count === 1 ? "" : "s"}
                </p>
                {jobPage.results.length > 0 && (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Program</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobPage.results.slice(0, 10).map((job) => (
                          <TableRow key={job.id}>
                            <TableCell className="font-mono text-xs">{job.id}</TableCell>
                            <TableCell className="text-xs">{job.customer?.title ?? "—"}</TableCell>
                            <TableCell className="text-xs">{job.program?.title ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                        {jobPage.results.length > 10 && (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center text-xs text-muted-foreground">
                              +{jobPage.results.length - 10} more…
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {jobPage.count > 0 && (
                  <Button size="sm" onClick={() => setActiveStep("configure")}>
                    Next: Configure →
                  </Button>
                )}
              </>
            ) : (
              <EmptyState
                title="No search yet"
                description="Choose filters and click Search to see invoiceable visits."
                className="min-h-40"
              />
            )}
          </div>
        )}

        {/* ── STEP 2: Configure ── */}
        {activeStep === "configure" && (
          <div className="space-y-4">
            <h3 className="font-semibold">Configure Invoice</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select value={confirmCustomerId} onValueChange={setConfirmCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(customers.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="billing-date-studio">Billing date</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="billing-date-studio"
                    type="date"
                    value={billingDate}
                    onChange={(e) => setBillingDate(e.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setBillingDate(todayISO())}
                  >
                    Today
                  </Button>
                </div>
              </div>
            </div>
            <Button size="sm" disabled={!confirmCustomerId || !billingDate} onClick={() => setActiveStep("charges")}>
              Next: Extra charges →
            </Button>
          </div>
        )}

        {/* ── STEP 3: Charges ── */}
        {activeStep === "charges" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Extra Charges</h3>
              <Button size="sm" variant="outline" onClick={addCustomLine}>
                <HugeiconsIcon icon={PlusSignIcon} aria-hidden className="size-4" />
                Add line
              </Button>
            </div>

            {/* Quick templates */}
            <div className="flex flex-wrap gap-2">
              {CHARGE_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => {
                    const province =
                      customLines.length > 0
                        ? customLines[customLines.length - 1].province
                        : DEFAULT_PROVINCE;
                    setCustomLines((prev) => [
                      ...prev,
                      { name: t.name, date: todayISO(), province, units: t.units, rate: t.rate },
                    ]);
                  }}
                  className="rounded-full border px-3 py-1 text-xs hover:bg-muted"
                >
                  + {t.label}
                </button>
              ))}
            </div>

            {customLines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No extra charges — skip this step if none are needed.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Province</TableHead>
                      <TableHead>Units</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customLines.map((line, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Input
                            value={line.name}
                            onChange={(e) => updateLine(i, { name: e.target.value })}
                            className="h-7 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={line.date}
                            onChange={(e) => updateLine(i, { date: e.target.value })}
                            className="h-7 text-xs w-36"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={line.province}
                            onValueChange={(v) => updateLine(i, { province: v })}
                          >
                            <SelectTrigger className="h-7 text-xs w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PROVINCE_OPTIONS.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={line.units}
                            onChange={(e) => updateLine(i, { units: Number(e.target.value) })}
                            className="h-7 text-xs w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={line.rate}
                            onChange={(e) => updateLine(i, { rate: Number(e.target.value) })}
                            className="h-7 text-xs w-24"
                          />
                        </TableCell>
                        <TableCell className="text-xs font-semibold">${lineTotal(line)}</TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => removeCustomLine(i)}
                            className="rounded p-1 hover:bg-muted text-destructive"
                          >
                            <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {customLines.length > 0 && (
              <p className="text-sm text-right font-semibold">
                Custom lines total: ${customLinesTotal.toFixed(2)}
              </p>
            )}

            <Button size="sm" onClick={() => setActiveStep("finalize")}>
              Next: Finalize →
            </Button>
          </div>
        )}

        {/* ── STEP 4: Finalize ── */}
        {activeStep === "finalize" && (
          <div className="space-y-4">
            <h3 className="font-semibold">Finalize Invoice</h3>

            {/* Readiness checklist */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              {[
                {
                  label: "Visits selected",
                  done: !!jobPage && jobPage.count > 0,
                  detail: jobPage ? `${jobPage.count} visits` : "No search run yet",
                },
                {
                  label: "Customer confirmed",
                  done: !!confirmCustomerId,
                  detail:
                    (customers.data ?? []).find((c) => String(c.id) === confirmCustomerId)?.title ??
                    "None selected",
                },
                {
                  label: "Billing date set",
                  done: !!billingDate,
                  detail: billingDate || "Not set",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    className={cn("size-4 shrink-0", item.done ? "text-green-500" : "text-muted-foreground/40")}
                  />
                  <span className={cn("font-medium", !item.done && "text-muted-foreground")}>
                    {item.label}
                  </span>
                  <span className="text-xs text-muted-foreground">— {item.detail}</span>
                </div>
              ))}
            </div>

            {progressError && (
              <p className="text-sm text-destructive">{progressError}</p>
            )}

            {finalizedId && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-center justify-between">
                <p className="text-sm text-green-700">
                  Invoice #{finalizedId} finalized successfully.
                </p>
                {finalizedLocation && (
                  <a
                    href={finalizedLocation}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary underline"
                  >
                    Download
                  </a>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                disabled={!canPreview || !!progressLabel}
                onClick={handlePreview}
              >
                {progressLabel === "Requesting invoice preview…" ? "Generating…" : "Preview PDF"}
              </Button>
              <Button
                disabled={!canFinalize || !!progressLabel}
                onClick={() => setShowFinalizeConfirm(true)}
              >
                {progressLabel === "Finalizing invoice…" ? "Finalizing…" : "Finalize Invoice"}
              </Button>
              {progressLabel && (
                <p className="text-sm text-muted-foreground">{progressLabel}</p>
              )}
            </div>
          </div>
        )}
          </div>
        </div>

        <aside
          aria-label="Invoice summary"
          className="hidden border-l bg-[linear-gradient(180deg,#fbfcff_0%,#f5f8ff_100%)] p-5 lg:block"
        >
          <div className="sticky top-4 space-y-4">
            <div>
              <h2 className="text-base font-bold">Live summary</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Switch steps anytime — this panel stays in sync.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border bg-white px-3 py-3">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Visits
                </p>
                <p className="mt-1 text-sm font-semibold">{visitCountLabel}</p>
              </div>
              <div className="rounded-xl border bg-white px-3 py-3">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Extra charges
                </p>
                <p className="mt-1 text-sm font-semibold">
                  ${customLinesTotal.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {STEPS.map((step) => {
                const complete = stepComplete(step.id);
                const active = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveStep(step.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                      active
                        ? "border-primary/30 bg-primary/5"
                        : "border-transparent bg-white hover:bg-muted/40",
                      complete && !active && "border-green-100",
                    )}
                  >
                    {complete ? (
                      <HugeiconsIcon
                        icon={CheckmarkCircle01Icon}
                        className="mt-0.5 size-4 shrink-0 text-green-500"
                      />
                    ) : (
                      <span
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                          active
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/40",
                        )}
                      >
                        {active && <span className="size-1.5 rounded-full bg-white" />}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{step.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {stepDetail(step.id)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                disabled={!canPreview || !!progressLabel}
                onClick={handlePreview}
              >
                Preview
              </Button>
              <Button
                type="button"
                disabled={!canFinalize || !!progressLabel}
                onClick={() => setShowFinalizeConfirm(true)}
              >
                Finalize
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={showFinalizeConfirm}
        onOpenChange={setShowFinalizeConfirm}
        title="Finalize Invoice"
        question="Are you sure you want to finalize this invoice?"
        onConfirm={handleFinalize}
      />
    </div>
  );
}
