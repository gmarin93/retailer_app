"use client";

import { format } from "date-fns";
import {
  BulbIcon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  EyeIcon,
  FlashIcon,
  PlusSignIcon,
  Search01Icon,
  Tick02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState, type ReactNode } from "react";
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
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { cn } from "@/shared/lib/utils";
import { useCustomersByTitle } from "@/shared/services/entities/customers";
import { useCyclesByDate } from "@/shared/services/entities/cycles";
import type { CustomChargeLine, InvoiceableJobPage } from "../schemas";
import { CHARGE_TEMPLATES, DEFAULT_PROVINCE, PROVINCE_OPTIONS } from "../schemas";
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

const TIPS = [
  { icon: Search01Icon, text: "Search visits first — the summary updates as you go." },
  { icon: UserIcon, text: "Confirm one customer so only their visits land on the invoice." },
  { icon: FlashIcon, text: "Use quick charge templates for common add-on lines." },
  { icon: EyeIcon, text: "Preview downloads a draft before you finalize." },
] as const;

function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

function endOfMonthISO() {
  const now = new Date();
  return format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd");
}

/**
 * Customer Invoice Studio — layout ported from Angular
 * `customer-invoice-studio.component` (header, step tabs, live summary rail).
 */
export function CustomerInvoiceStudioView() {
  const customers = useCustomersByTitle();
  const cycles = useCyclesByDate();

  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterCycle, setFilterCycle] = useState("");

  const [activeFilter, setActiveFilter] = useState<InvoiceableJobsFilter>({});
  const [jobPage, setJobPage] = useState<InvoiceableJobPage | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);

  const [confirmCustomerId, setConfirmCustomerId] = useState("");
  const [billingDate, setBillingDate] = useState(todayISO());

  const [customLines, setCustomLines] = useState<CustomChargeLine[]>([]);

  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [finalizedId, setFinalizedId] = useState<number | null>(null);
  const [finalizedLocation, setFinalizedLocation] = useState<string | null>(null);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  const [activeStep, setActiveStep] = useState<StudioStep>("visits");
  const [showTips, setShowTips] = useState(false);

  const canFinalize =
    !!jobPage && jobPage.count > 0 && !!confirmCustomerId && !!billingDate && !progressLabel;
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
  const customLinesTotal = customLines.reduce((sum, line) => sum + line.units * line.rate, 0);
  const confirmCustomer = (customers.data ?? []).find(
    (customer) => String(customer.id) === confirmCustomerId,
  );

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
      customLines.length > 0 ? customLines[customLines.length - 1]!.province : DEFAULT_PROVINCE;
    setCustomLines((prev) => [
      ...prev,
      { name: `New line ${prev.length + 1}`, date: todayISO(), province, units: 1, rate: 0 },
    ]);
  };

  const removeCustomLine = (index: number) =>
    setCustomLines((prev) => prev.filter((_, i) => i !== index));

  const updateLine = (index: number, patch: Partial<CustomChargeLine>) =>
    setCustomLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );

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

  return (
    <div className="-mx-6 flex min-h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-none bg-[#f4f6fb] md:-mx-8 dark:bg-background">
      {/* Header */}
      <header className="flex shrink-0 flex-wrap items-end gap-3 border-b border-border bg-card px-6 pt-5 pb-4 shadow-[0_2px_8px_rgba(17,24,39,0.06)] md:gap-6">
        <div className="min-w-[220px] flex-1">
          <h1 className="text-[22px] font-bold tracking-tight text-foreground">
            Customer Invoicing
          </h1>
          <p className="mt-1 text-[13.5px] leading-snug text-muted-foreground">
            Build customer invoices on one screen with a live summary and smart suggestions.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            {readinessCompleteCount}/{STEPS.length} ready
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
            {visitCountLabel}
          </span>
          {customLines.length > 0 ? (
            <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              {customLines.length} extra line{customLines.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setShowTips((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-border bg-card px-3.5 py-2 text-[13px] font-semibold text-foreground transition-colors hover:border-primary/25 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
        >
          <HugeiconsIcon icon={BulbIcon} className="size-[18px] text-primary" aria-hidden="true" />
          Tips
        </button>
      </header>

      {showTips ? (
        <section
          aria-label="Customer invoicing tips"
          className="shrink-0 border-b border-amber-200 bg-[#fffbeb] px-6 py-3 dark:border-amber-500/30 dark:bg-amber-500/10"
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5 md:gap-x-4">
            {TIPS.map((tip) => (
              <span
                key={tip.text}
                className="flex items-center gap-2 text-[12.5px] leading-snug text-amber-900 dark:text-amber-100"
              >
                <HugeiconsIcon
                  icon={tip.icon}
                  className="size-4 shrink-0 text-amber-600 dark:text-amber-300"
                  aria-hidden="true"
                />
                {tip.text}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-0 flex-col overflow-hidden">
          {/* Step tabs */}
          <nav
            aria-label="Invoice steps"
            className="grid shrink-0 grid-cols-2 gap-2 border-b border-border bg-card px-6 pt-3 md:grid-cols-4"
          >
            {STEPS.map((step) => {
              const active = activeStep === step.id;
              const complete = stepComplete(step.id);
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-t-xl border px-3 py-2.5 text-left text-muted-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                    active
                      ? "border-primary/25 border-b-[#f4f6fb] bg-[#f4f6fb] font-semibold text-primary dark:border-b-background dark:bg-background"
                      : "border-border bg-[#f8faff] hover:bg-primary/5 dark:bg-muted/40",
                    complete && !active && "text-emerald-700 dark:text-emerald-400",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-[22px] shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-foreground/10 text-foreground",
                    )}
                  >
                    {step.number}
                  </span>
                  <span className="min-w-0 truncate text-[13px] leading-tight">{step.label}</span>
                  {complete ? (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      className="ml-auto size-4 shrink-0 text-green-600"
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-[#f4f6fb] px-6 py-2.5 dark:bg-background">
            <button
              type="button"
              disabled={!canGoBack}
              onClick={() => setActiveStep(STEPS[activeStepIndex - 1]!.id)}
              className="inline-flex h-10 items-center justify-center rounded-[10px] border-[1.5px] border-primary bg-card px-4.5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => setActiveStep(STEPS[activeStepIndex + 1]!.id)}
              className="inline-flex h-10 items-center justify-center rounded-[10px] bg-primary px-4.5 text-[13px] font-semibold text-primary-foreground shadow-[0_1px_3px_rgba(76,111,255,0.25)] transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
            >
              Next
            </button>
          </div>

          <main
            className={cn(
              "min-h-0 flex-1 overflow-auto px-6 py-4",
              activeStep === "visits" && "overflow-hidden px-4 py-3",
            )}
          >
            {activeStep === "visits" ? (
              <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[14px] border border-black/5 bg-card shadow-[0_2px_8px_rgba(17,24,39,0.06)] dark:border-border">
                <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="w-52 space-y-1.5">
                      <Label>Customer</Label>
                      <Select
                        value={filterCustomer || undefined}
                        onValueChange={(value) =>
                          setFilterCustomer(value === "__any__" ? "" : value)
                        }
                      >
                        <SelectTrigger className="bg-card">
                          <SelectValue placeholder="Any customer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__any__">Any</SelectItem>
                          {(customers.data ?? []).map((customer) => (
                            <SelectItem key={customer.id} value={String(customer.id)}>
                              {customer.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-52 space-y-1.5">
                      <Label>Cycle</Label>
                      <Select
                        value={filterCycle || undefined}
                        onValueChange={(value) =>
                          setFilterCycle(value === "__any__" ? "" : value)
                        }
                      >
                        <SelectTrigger className="bg-card">
                          <SelectValue placeholder="Any cycle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__any__">Any</SelectItem>
                          {(cycles.data ?? []).map((cycle) => (
                            <SelectItem key={cycle.id} value={String(cycle.id)}>
                              {cycle.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <button
                      type="button"
                      onClick={() => void searchJobs(0)}
                      disabled={jobsLoading}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-primary px-4.5 text-[13px] font-semibold text-primary-foreground shadow-[0_1px_3px_rgba(76,111,255,0.25)] transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:opacity-45"
                    >
                      <HugeiconsIcon icon={Search01Icon} className="size-4" aria-hidden="true" />
                      {jobsLoading ? "Searching…" : "Search"}
                    </button>
                  </div>

                  {jobsLoading ? (
                    <LoadingState label="Loading invoiceable jobs…" className="min-h-40" />
                  ) : jobsError ? (
                    <ErrorState error={new Error(jobsError)} onRetry={() => void searchJobs(0)} />
                  ) : jobPage ? (
                    <div className="min-h-0 flex-1 space-y-3 overflow-auto">
                      <p className="text-sm text-muted-foreground">
                        {jobPage.count} invoiceable visit{jobPage.count === 1 ? "" : "s"}
                      </p>
                      {jobPage.results.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Job #</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Program</TableHead>
                                <TableHead>Store</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {jobPage.results.slice(0, 25).map((job) => (
                                <TableRow key={job.id}>
                                  <TableCell className="font-mono text-xs">{job.id}</TableCell>
                                  <TableCell className="text-xs">
                                    {job.customer?.title ?? "—"}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {job.program?.title ?? "—"}
                                  </TableCell>
                                  <TableCell className="text-xs">
                                    {job.store?.title || "—"}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <EmptyPanel
                          title="No visits match"
                          detail="No visits match your current search filter."
                        />
                      )}
                    </div>
                  ) : (
                    <EmptyPanel
                      title="Fill out the form and press the search button to get started."
                      detail="Choose a customer and cycle, then search invoiceable visits."
                    />
                  )}
                </div>
              </section>
            ) : null}

            {activeStep === "configure" ? (
              <StudioSection
                step={2}
                title="Configure invoice"
                hint="Confirm the customer and billing date shown on the invoice cover page."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Confirm customer</Label>
                    <Select value={confirmCustomerId || undefined} onValueChange={setConfirmCustomerId}>
                      <SelectTrigger className="bg-card">
                        <SelectValue placeholder="Confirm customer" />
                      </SelectTrigger>
                      <SelectContent searchPlaceholder="Search customers…">
                        {(customers.data ?? []).map((customer) => (
                          <SelectItem key={customer.id} value={String(customer.id)}>
                            {customer.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Only visits for this customer will be included on the invoice.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="billing-date-studio">Billing date</Label>
                      <Input
                        id="billing-date-studio"
                        type="date"
                        value={billingDate}
                        onChange={(event) => setBillingDate(event.target.value)}
                        className="bg-card"
                      />
                      <p className="text-xs text-muted-foreground">
                        Display only — does not change your visit search.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PillButton onClick={() => setBillingDate(todayISO())}>Today</PillButton>
                      <PillButton onClick={() => setBillingDate(endOfMonthISO())}>
                        End of month
                      </PillButton>
                    </div>
                  </div>
                </div>
              </StudioSection>
            ) : null}

            {activeStep === "charges" ? (
              <StudioSection
                step={3}
                title="Additional charges"
                hint="Optional line items added on top of the selected visits."
                badge={
                  customLinesTotal > 0
                    ? `$${customLinesTotal.toFixed(2)}`
                    : undefined
                }
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                    Quick add
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {CHARGE_TEMPLATES.map((template) => (
                      <PillButton
                        key={template.label}
                        onClick={() => {
                          const province =
                            customLines.length > 0
                              ? customLines[customLines.length - 1]!.province
                              : DEFAULT_PROVINCE;
                          setCustomLines((prev) => [
                            ...prev,
                            {
                              name: template.name,
                              date: todayISO(),
                              province,
                              units: template.units,
                              rate: template.rate,
                            },
                          ]);
                        }}
                      >
                        <HugeiconsIcon
                          icon={PlusSignIcon}
                          className="size-4 text-primary"
                          aria-hidden="true"
                        />
                        {template.label}
                      </PillButton>
                    ))}
                  </div>
                </div>

                {customLines.length === 0 ? (
                  <EmptyPanel
                    title="No additional charges yet."
                    detail="Use a quick template above or add a custom line below."
                  />
                ) : (
                  <div className="space-y-2">
                    {customLines.map((line, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 items-start gap-2 rounded-xl border border-border bg-[#fafbfd] p-3 md:grid-cols-[minmax(140px,2fr)_150px_100px_90px_90px_90px_40px] dark:bg-muted/30"
                      >
                        <Input
                          value={line.name}
                          onChange={(event) => updateLine(index, { name: event.target.value })}
                          placeholder="Description"
                          className="bg-card"
                        />
                        <Input
                          type="date"
                          value={line.date}
                          onChange={(event) => updateLine(index, { date: event.target.value })}
                          className="bg-card"
                        />
                        <Select
                          value={line.province}
                          onValueChange={(value) => updateLine(index, { province: value })}
                        >
                          <SelectTrigger className="bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent searchable={false}>
                            {PROVINCE_OPTIONS.map((province) => (
                              <SelectItem key={province.value} value={province.value}>
                                {province.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={0}
                          value={line.units}
                          onChange={(event) =>
                            updateLine(index, { units: Number(event.target.value) })
                          }
                          className="bg-card"
                        />
                        <Input
                          type="number"
                          min={0}
                          value={line.rate}
                          onChange={(event) =>
                            updateLine(index, { rate: Number(event.target.value) })
                          }
                          className="bg-card"
                        />
                        <div className="flex min-h-9 flex-col justify-center px-1">
                          <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                            Amount
                          </span>
                          <strong className="text-sm">${lineTotal(line)}</strong>
                        </div>
                        <button
                          type="button"
                          aria-label="Remove line"
                          onClick={() => removeCustomLine(index)}
                          className="inline-flex h-11 w-10 items-center justify-center rounded-[10px] bg-red-100 text-red-700 transition-colors hover:bg-red-200 focus-visible:ring-2 focus-visible:ring-red-400/40 focus-visible:outline-none dark:bg-red-500/15 dark:text-red-300"
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <button
                    type="button"
                    onClick={addCustomLine}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-primary px-4.5 text-[13px] font-semibold text-primary-foreground shadow-[0_1px_3px_rgba(76,111,255,0.25)] transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                  >
                    <HugeiconsIcon icon={PlusSignIcon} className="size-4" aria-hidden="true" />
                    Add custom line
                  </button>
                </div>
              </StudioSection>
            ) : null}

            {activeStep === "finalize" ? (
              <StudioSection
                step={4}
                title="Preview & finalize"
                hint="Download a preview PDF, then finalize when everything looks right."
              >
                {!jobPage ? (
                  <EmptyPanel
                    title="Run a visit search to unlock preview and finalize."
                    detail="Complete step 1 first."
                    compact
                  />
                ) : jobPage.count === 0 ? (
                  <EmptyPanel
                    title="No visits match your current search filter."
                    detail="Adjust filters and search again."
                    compact
                  />
                ) : (
                  <>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
                      {[
                        { label: "Matching visits", value: String(jobPage.count) },
                        {
                          label: "Customer",
                          value: confirmCustomer?.title ?? "Not set",
                        },
                        {
                          label: "Billing date",
                          value: billingDate || "Not set",
                        },
                        {
                          label: "Extra charges",
                          value: `$${customLinesTotal.toFixed(2)}`,
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="flex flex-col gap-1.5 rounded-xl border border-border bg-[#fafbfd] p-3.5 dark:bg-muted/30"
                        >
                          <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                            {stat.label}
                          </span>
                          <strong className="text-sm leading-snug text-foreground">
                            {stat.value}
                          </strong>
                        </div>
                      ))}
                    </div>
                    <p className="text-[13px] leading-snug text-muted-foreground">
                      Visits belonging to the confirmed customer will be included on the invoice.
                    </p>
                  </>
                )}

                {finalizedId ? (
                  <div className="flex flex-wrap items-center gap-2.5 rounded-xl bg-emerald-50 px-3.5 py-3 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      className="size-5 text-green-600"
                      aria-hidden="true"
                    />
                    <span className="text-sm font-medium">
                      Successfully finalized invoice #{finalizedId}.
                    </span>
                    {finalizedLocation ? (
                      <a
                        href={finalizedLocation}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center rounded-[10px] bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground"
                      >
                        Download
                      </a>
                    ) : null}
                  </div>
                ) : null}

                {progressLabel ? (
                  <div className="rounded-xl bg-muted px-3.5 py-3 text-[13px] text-muted-foreground">
                    {progressLabel}
                  </div>
                ) : null}

                {progressError ? (
                  <div className="rounded-[10px] bg-red-100 px-3 py-2.5 text-[13px] text-red-700 dark:bg-red-500/15 dark:text-red-300">
                    {progressError}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    disabled={!canPreview || !!progressLabel}
                    onClick={() => void handlePreview()}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-primary bg-card px-4.5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <HugeiconsIcon icon={EyeIcon} className="size-[18px]" aria-hidden="true" />
                    Preview PDF
                  </button>
                  <button
                    type="button"
                    disabled={!canFinalize || !!progressLabel}
                    onClick={() => setShowFinalizeConfirm(true)}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-[#e85a3a] px-4.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#d14e30] focus-visible:ring-2 focus-visible:ring-[#e85a3a]/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      className="size-[18px]"
                      aria-hidden="true"
                    />
                    Finalize invoice
                  </button>
                </div>
              </StudioSection>
            ) : null}
          </main>
        </div>

        {/* Live summary */}
        <aside
          aria-label="Invoice summary"
          className="hidden min-h-0 overflow-auto border-l border-border bg-card px-4.5 py-5 xl:block"
        >
          <div className="sticky top-0 flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-foreground">Live summary</h2>
              <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
                Switch steps anytime — this panel stays in sync.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-border bg-[#fafbfd] p-3 dark:bg-muted/30">
                <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Visits
                </span>
                <strong className="text-[15px] text-foreground">{visitCountLabel}</strong>
              </div>
              <div className="rounded-xl border border-border bg-[#fafbfd] p-3 dark:bg-muted/30">
                <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Extra charges
                </span>
                <strong className="text-[15px] text-foreground">
                  ${customLinesTotal.toFixed(2)}
                </strong>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {STEPS.map((step) => {
                const complete = stepComplete(step.id);
                const active = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setActiveStep(step.id)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none",
                      active
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card hover:bg-muted/40",
                      complete && !active && "border-emerald-200 dark:border-emerald-500/30",
                    )}
                  >
                    {complete ? (
                      <HugeiconsIcon
                        icon={CheckmarkCircle01Icon}
                        className="mt-0.5 size-4 shrink-0 text-green-600"
                        aria-hidden="true"
                      />
                    ) : (
                      <span
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                          active ? "border-primary" : "border-muted-foreground/35",
                        )}
                      >
                        {active ? (
                          <span className="size-1.5 rounded-full bg-primary" />
                        ) : null}
                      </span>
                    )}
                    <span className="min-w-0">
                      <strong className="block text-sm text-foreground">{step.label}</strong>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {stepDetail(step.id)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={!canPreview || !!progressLabel}
                onClick={() => void handlePreview()}
                className="inline-flex h-10 items-center justify-center rounded-[10px] border-[1.5px] border-primary bg-card text-[13px] font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
              >
                Preview
              </button>
              <button
                type="button"
                disabled={!canFinalize || !!progressLabel}
                onClick={() => setShowFinalizeConfirm(true)}
                className="inline-flex h-10 items-center justify-center rounded-[10px] bg-[#e85a3a] text-[13px] font-semibold text-white transition-colors hover:bg-[#d14e30] focus-visible:ring-2 focus-visible:ring-[#e85a3a]/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
              >
                Finalize
              </button>
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

function StudioSection({
  step,
  title,
  hint,
  badge,
  children,
}: {
  step: number;
  title: string;
  hint: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-black/5 bg-card shadow-[0_2px_8px_rgba(17,24,39,0.06)] dark:border-border">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-[linear-gradient(180deg,#fafbff_0%,#ffffff_100%)] px-5 py-4 dark:bg-card">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-primary-foreground">
            {step}
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">{hint}</p>
          </div>
        </div>
        {badge ? (
          <span className="rounded-full bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-3.5 px-5 py-5">{children}</div>
    </section>
  );
}

function PillButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-[#f8faff] px-3 py-1.5 text-[12.5px] font-semibold text-foreground transition-colors hover:border-primary/25 hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none dark:bg-muted/40"
    >
      {children}
    </button>
  );
}

function EmptyPanel({
  title,
  detail,
  compact,
}: {
  title: string;
  detail: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-[#fafbfd] text-center dark:bg-muted/20",
        compact ? "px-4 py-4.5" : "px-4 py-7",
      )}
    >
      <p className="m-0 text-sm font-semibold text-foreground">{title}</p>
      <span className="text-[12.5px] text-muted-foreground">{detail}</span>
    </div>
  );
}
