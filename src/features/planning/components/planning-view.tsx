"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { EmptyState } from "@/shared/components/empty-state";
import { LoadingState } from "@/shared/components/loading-state";
import { PageHeader } from "@/shared/components/page-header";
import { cn } from "@/shared/lib/utils";
import { getCurrentCycle, useCyclesByDate } from "@/shared/services/entities/cycles";
import { useCustomersByTitle } from "@/shared/services/entities/customers";
import { useActivePrograms } from "@/shared/services/entities/programs";
import {
  Alert02Icon,
  Briefcase01Icon,
  Building02Icon,
  Calendar03Icon,
  Camera01Icon,
  Cash01Icon,
  CheckmarkCircle02Icon,
  ClipboardIcon,
  File01Icon,
  HelpCircleIcon,
  Layers01Icon,
  MagicWand01Icon,
  MultiplicationSignCircleIcon,
  PlusSignIcon,
  Store01Icon,
  Tick02Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { fetchPlan, type ListablePlan } from "../api";
import { useCreatePlan, usePlans, usePlansReadiness, planningKeys } from "../hooks";
import type { PlansChartRequest } from "../schemas";
import type { PlanEditorTab } from "../types";
import { formatPlanStatus } from "../types";
import { getNextGroup } from "../utils";
import { PlanEditor } from "./plan-editor";
import { PlansDownloadDialog } from "./plans-download-dialog";
import { SetBudgetDialog } from "./set-budget-dialog";

const PLAN_TABS: { id: PlanEditorTab; label: string; icon: IconSvgElement }[] = [
  { id: "details", label: "Plans", icon: ClipboardIcon },
  { id: "stores", label: "Stores", icon: Store01Icon },
  { id: "visits", label: "Visits", icon: Calendar03Icon },
  { id: "photos", label: "Photos", icon: Camera01Icon },
  { id: "questions", label: "Questions", icon: HelpCircleIcon },
  { id: "documents", label: "Documents", icon: File01Icon },
];

/** Quick-nav icons shown inside each group card (all tabs except details). */
const CARD_QUICK_TABS: { id: PlanEditorTab; icon: IconSvgElement }[] = [
  { id: "stores", icon: Building02Icon },
  { id: "visits", icon: Calendar03Icon },
  { id: "photos", icon: Camera01Icon },
  { id: "questions", icon: HelpCircleIcon },
  { id: "documents", icon: File01Icon },
];

/** Deferred: recharts stays out of the planning route's initial bundle. */
const PlanningCharts = dynamic(
  () => import("./planning-charts").then((mod) => mod.PlanningCharts),
  { ssr: false, loading: () => <LoadingState label="Loading charts…" className="min-h-48" /> },
);

/** Angular `formatPlanCost` — whole-dollar USD. */
function formatPlanCost(cost: number | null | undefined): string {
  if (cost == null || Number.isNaN(cost)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cost);
}

/** Numbered step circle for the cycle → customer → program stepper. */
function StepIndex({ index, done, locked }: { index: number; done: boolean; locked: boolean }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
        done
          ? "border-green-500 bg-green-500 text-white"
          : locked
            ? "border-muted-foreground/30 text-muted-foreground/50"
            : "border-primary text-primary",
      )}
    >
      {done ? <HugeiconsIcon icon={Tick02Icon} aria-hidden className="size-4" /> : index}
    </span>
  );
}

/**
 * Planning Studio browse + plan editor: cycle → customer → program → group,
 * with create/edit/lifecycle for the selected plan.
 */
export function PlanningView() {
  const searchParams = useSearchParams();
  const planParam = Number.parseInt(searchParams.get("plan") ?? "", 10);
  const deepLinkPlanId = Number.isFinite(planParam) && planParam > 0 ? planParam : null;

  const { data: cycles = [] } = useCyclesByDate();
  const customers = useCustomersByTitle();

  const [cycleId, setCycleId] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [programId, setProgramId] = useState<number | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<PlanEditorTab>("details");
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);

  const deepLinkQuery = useQuery({
    queryKey: [...planningKeys.all, "deep-link", deepLinkPlanId],
    queryFn: ({ signal }) => fetchPlan(deepLinkPlanId!, signal),
    enabled: deepLinkPlanId != null,
  });

  const deepLink =
    deepLinkQuery.data && deepLinkPlanId === deepLinkQuery.data.id ? deepLinkQuery.data : null;

  const effectiveCycleId =
    cycleId ?? deepLink?.cycle?.id ?? getCurrentCycle(cycles)?.id ?? null;
  const effectiveCustomerId = customerId ?? deepLink?.program?.customer?.id ?? null;
  const effectiveProgramId = programId ?? deepLink?.program?.id ?? null;
  const programs = useActivePrograms(effectiveCustomerId);

  const plansQuery = usePlans(effectiveCycleId, effectiveProgramId);
  const readinessQuery = usePlansReadiness(effectiveCycleId, effectiveProgramId);
  const createMutation = useCreatePlan(effectiveCycleId, effectiveProgramId);

  const plans = plansQuery.data ?? [];
  const preferredPlanId = selectedPlanId ?? deepLink?.id ?? null;
  const selectedPlan: ListablePlan | null =
    plans.find((plan) => plan.id === preferredPlanId) ?? plans[0] ?? null;

  const readiness = readinessQuery.data ?? new Map();
  const selectedProgram = (programs.data ?? []).find(
    (program) => program.id === effectiveProgramId,
  );
  const retailerId = selectedProgram?.retailer?.id ?? deepLink?.program?.retailer?.id ?? null;

  const chartScope: PlansChartRequest | null =
    selectedPlan != null
      ? { plan: selectedPlan.id }
      : effectiveProgramId != null && effectiveCycleId != null
        ? { cycle: effectiveCycleId, program: effectiveProgramId }
        : effectiveCustomerId != null && effectiveCycleId != null
          ? { cycle: effectiveCycleId, customer: effectiveCustomerId }
          : null;

  function handleNewGroup() {
    if (effectiveCycleId == null || effectiveProgramId == null) return;
    createMutation.mutate(
      {
        cycle: effectiveCycleId,
        program: effectiveProgramId,
        group: getNextGroup(plans.length),
      },
      {
        onSuccess: (plan) => setSelectedPlanId(plan.id),
      },
    );
  }

  // Angular studio KPI aggregates (`groupStats` / `totalExpectedJobs` / cost).
  const groupStats = plans.reduce(
    (stats, plan) => {
      const level = readiness.get(plan.id)?.readiness;
      if (level === "ready") stats.ready += 1;
      else if (level === "warning") stats.warning += 1;
      else if (level === "blocked") stats.blocked += 1;
      return stats;
    },
    { total: plans.length, ready: 0, warning: 0, blocked: 0 },
  );
  const totalExpectedJobs = plans.reduce((sum, plan) => sum + (plan.expected_jobs || 0), 0);
  const totalPlanCost = plans.reduce((sum, plan) => sum + (plan.total_cost || 0), 0);
  const hasProgram = effectiveProgramId !== null && effectiveCycleId !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Planning"
          description="A guided way to plan visits across cycles, customers, and programs."
        />
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {hasProgram && (
            <>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                <HugeiconsIcon icon={Layers01Icon} aria-hidden className="size-3.5" />
                {groupStats.total} group{groupStats.total === 1 ? "" : "s"}
              </span>
              {totalExpectedJobs > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <HugeiconsIcon icon={Briefcase01Icon} aria-hidden className="size-3.5" />
                  {totalExpectedJobs.toLocaleString()} jobs
                </span>
              )}
            </>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDownloadOpen(true)}
          >
            Download
          </Button>
        </div>
      </div>

      {/* Cycle → Customer → Program setup stepper (Angular `studio-stepper`). */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 pt-5">
          <div className="flex min-w-52 flex-1 items-center gap-3">
            <StepIndex index={1} done={effectiveCycleId !== null} locked={false} />
            <div className="min-w-0 flex-1 space-y-1">
              <span className="block text-xs font-medium text-muted-foreground">Cycle</span>
              <Select
                value={effectiveCycleId === null ? "" : String(effectiveCycleId)}
                onValueChange={(value) => {
                  setCycleId(Number(value));
                  setSelectedPlanId(null);
                }}
              >
                <SelectTrigger size="sm" aria-label="Cycle" className="w-full">
                  <SelectValue placeholder="Select one" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {cycles.map((cycle) => (
                    <SelectItem key={cycle.id} value={String(cycle.id)}>
                      {cycle.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <span
            aria-hidden
            className={cn(
              "hidden h-px w-8 shrink-0 md:block",
              effectiveCustomerId !== null ? "bg-green-500" : "bg-border",
            )}
          />

          <div className="flex min-w-52 flex-1 items-center gap-3">
            <StepIndex
              index={2}
              done={effectiveCustomerId !== null}
              locked={effectiveCycleId === null}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <span className="block text-xs font-medium text-muted-foreground">Customer</span>
              <Select
                value={effectiveCustomerId === null ? "" : String(effectiveCustomerId)}
                onValueChange={(value) => {
                  setCustomerId(Number(value));
                  setProgramId(null);
                  setSelectedPlanId(null);
                }}
              >
                <SelectTrigger size="sm" aria-label="Customer" className="w-full">
                  <SelectValue placeholder="Select one" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {(customers.data ?? []).map((customer) => (
                    <SelectItem key={customer.id} value={String(customer.id)}>
                      {customer.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <span
            aria-hidden
            className={cn(
              "hidden h-px w-8 shrink-0 md:block",
              effectiveProgramId !== null ? "bg-green-500" : "bg-border",
            )}
          />

          <div className="flex min-w-52 flex-1 items-center gap-3">
            <StepIndex
              index={3}
              done={effectiveProgramId !== null}
              locked={effectiveCustomerId === null}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <span className="block text-xs font-medium text-muted-foreground">Program</span>
              <Select
                value={effectiveProgramId === null ? "" : String(effectiveProgramId)}
                onValueChange={(value) => {
                  setProgramId(Number(value));
                  setSelectedPlanId(null);
                }}
                disabled={effectiveCustomerId === null}
              >
                <SelectTrigger size="sm" aria-label="Program" className="w-full">
                  <SelectValue
                    placeholder={
                      effectiveCustomerId === null ? "Select a customer first" : "Select one"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {(programs.data ?? []).map((program) => (
                    <SelectItem key={program.id} value={String(program.id)}>
                      {program.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI stat row (Angular `studio-stat` chips). */}
      {hasProgram && plans.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            {
              label: "Groups",
              value: groupStats.total.toLocaleString(),
              icon: Layers01Icon,
              tile: "bg-blue-100 text-blue-600",
            },
            {
              label: "Ready",
              value: groupStats.ready.toLocaleString(),
              icon: CheckmarkCircle02Icon,
              tile: "bg-green-100 text-green-600",
            },
            {
              label: "Warnings",
              value: groupStats.warning.toLocaleString(),
              icon: Alert02Icon,
              tile: "bg-amber-100 text-amber-600",
            },
            {
              label: "Blocked",
              value: groupStats.blocked.toLocaleString(),
              icon: MultiplicationSignCircleIcon,
              tile: "bg-red-100 text-red-600",
            },
            {
              label: "Expected jobs",
              value: totalExpectedJobs.toLocaleString(),
              icon: Briefcase01Icon,
              tile: "bg-violet-100 text-violet-600",
            },
            {
              label: "Plan cost",
              value: formatPlanCost(totalPlanCost),
              icon: Cash01Icon,
              tile: "bg-teal-100 text-teal-600",
            },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-2.5 pt-4">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    stat.tile,
                  )}
                >
                  <HugeiconsIcon icon={stat.icon} aria-hidden className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    {stat.label}
                  </span>
                  <span className="block truncate text-base font-semibold tabular-nums">
                    {stat.value}
                  </span>
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {chartScope && (
        <PlanningCharts
          scope={chartScope}
          canSetBudget={effectiveCustomerId != null}
          onSetBudget={() => setBudgetOpen(true)}
        />
      )}

      {effectiveProgramId === null || effectiveCycleId === null ? (
        <EmptyState
          icon={MagicWand01Icon}
          title="Pick a cycle, customer, and program"
          description="Plans appear here. Select a group to edit stores, visits, photos, and questions."
        />
      ) : plansQuery.isLoading ? (
        <LoadingState label="Loading plans…" className="min-h-60" />
      ) : (
        <div className="space-y-4">
          {/* Groups horizontal card strip — parity with Angular planner. */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {plans.length}
              </span>
              Groups
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {plans.map((plan) => {
                const summary = readiness.get(plan.id);
                const level = summary?.readiness ?? "warning";
                const isSelected = selectedPlan?.id === plan.id;
                const DOT_COLORS: Record<string, string> = {
                  ready: "bg-success",
                  warning: "bg-warning",
                  blocked: "bg-destructive",
                };
                return (
                  <div
                    key={plan.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setActiveTab("details");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedPlanId(plan.id);
                        setActiveTab("details");
                      }
                    }}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex min-w-[180px] max-w-[220px] shrink-0 cursor-pointer flex-col gap-2 rounded-xl border bg-card p-3 text-left transition-all duration-150 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      isSelected
                        ? "border-primary shadow-[0_0_0_1px_var(--primary)] shadow-primary/20"
                        : "border-border",
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <HugeiconsIcon icon={UserGroupIcon} aria-hidden className="size-4.5" />
                      </span>
                      <span className="min-w-0 flex-1 pt-0.5">
                        <span className="flex items-center gap-1.5">
                          <span className="block truncate text-sm font-semibold leading-tight">
                            {plan.group || "—"}
                          </span>
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              DOT_COLORS[level] ?? "bg-muted-foreground",
                            )}
                            title={level}
                          />
                        </span>
                        <span className="block text-xs capitalize text-muted-foreground">
                          {formatPlanStatus(plan.status)}
                          {plan.is_survey ? " · survey" : ""}
                        </span>
                        <span className="mt-0.5 block text-xs font-medium text-muted-foreground">
                          {plan.expected_jobs > 0
                            ? `${plan.expected_jobs.toLocaleString()} jobs`
                            : "0 jobs"}
                          {plan.total_cost > 0
                            ? ` · ${formatPlanCost(plan.total_cost)}`
                            : ""}
                        </span>
                      </span>
                    </div>
                    {/* Quick-nav tab icons — must not nest <button> inside the card control */}
                    <div className="flex items-center gap-1 border-t border-border/60 pt-2">
                      {CARD_QUICK_TABS.map((qt) => (
                        <button
                          key={qt.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlanId(plan.id);
                            setActiveTab(qt.id);
                          }}
                          className={cn(
                            "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50",
                            isSelected && activeTab === qt.id && "bg-primary/10 text-primary",
                          )}
                          aria-label={qt.id}
                        >
                          <HugeiconsIcon icon={qt.icon} aria-hidden className="size-3.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* New group card */}
              <button
                type="button"
                disabled={createMutation.isPending}
                onClick={handleNewGroup}
                className="flex min-w-[160px] shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-transparent p-3 text-sm font-medium text-primary/70 transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50"
              >
                <HugeiconsIcon icon={PlusSignIcon} aria-hidden className="size-4" />
                {createMutation.isPending ? "Creating…" : "New group"}
              </button>
            </div>
          </div>

          {selectedPlan ? (
            <>
              {/* Tab bar — Angular-style full-width pill tabs with icons */}
              <div className="flex flex-wrap gap-1 rounded-xl border bg-card p-1.5">
                {PLAN_TABS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <HugeiconsIcon icon={item.icon} aria-hidden className="size-4" />
                    {item.label}
                  </button>
                ))}
              </div>

              <PlanEditor
                plan={selectedPlan}
                cycleId={effectiveCycleId}
                programId={effectiveProgramId}
                customerId={effectiveCustomerId}
                retailerId={retailerId}
                cycles={cycles}
                customers={customers.data ?? []}
                tab={activeTab}
                onDeleted={() => setSelectedPlanId(null)}
                onCopied={(planId) => setSelectedPlanId(planId)}
              />
            </>
          ) : (
            <EmptyState
              icon={MagicWand01Icon}
              title="No plan selected"
              description="Select a group above to open the editor."
            />
          )}
        </div>
      )}

      <PlansDownloadDialog
        open={downloadOpen}
        onOpenChange={setDownloadOpen}
        cycles={cycles}
        customers={customers.data ?? []}
        defaultCycleId={effectiveCycleId}
        defaultCustomerId={effectiveCustomerId}
        defaultProgramId={effectiveProgramId}
      />

      {budgetOpen && (
        <SetBudgetDialog
          open={budgetOpen}
          onOpenChange={setBudgetOpen}
          cycles={cycles}
          defaultCycleId={effectiveCycleId}
          defaultCustomerId={effectiveCustomerId}
        />
      )}
    </div>
  );
}
