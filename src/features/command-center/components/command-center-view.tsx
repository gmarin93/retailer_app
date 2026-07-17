"use client";

import { RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { PageHeader } from "@/shared/components/page-header";
import { cn } from "@/shared/lib/utils";
import type { ActionQueue } from "../api";
import { useCommandCenter } from "../hooks";
import { assigneeLabel, closesLabel, healthFromCounts, storeLabel } from "../utils";

const ALL = "__all__";

const KPI_META = [
  { key: "completion", label: "Completion", variant: "green", format: (n: number) => `${n}%` },
  { key: "total", label: "Total visits", variant: "blue" },
  { key: "open", label: "In progress", variant: "teal" },
  { key: "pending", label: "Needs review", variant: "amber" },
  { key: "overdue", label: "Overdue", variant: "red" },
  { key: "unassigned", label: "Unassigned", variant: "violet" },
] as const;

const VARIANT_CLASSES: Record<string, string> = {
  green: "border-green-200 bg-green-50 text-green-800",
  blue: "border-blue-200 bg-blue-50 text-blue-800",
  teal: "border-teal-200 bg-teal-50 text-teal-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  red: "border-red-200 bg-red-50 text-red-800",
  violet: "border-violet-200 bg-violet-50 text-violet-800",
};

const HEALTH_CLASSES: Record<string, string> = {
  good: "bg-green-100 text-green-800",
  warn: "bg-amber-100 text-amber-800",
  bad: "bg-red-100 text-red-800",
  idle: "bg-muted text-muted-foreground",
};

const QUEUE_ACCENT: Record<ActionQueue["accent"], string> = {
  amber: "border-l-amber-400",
  red: "border-l-red-400",
  violet: "border-l-violet-400",
};

function reviewQuery(
  scope: { cycleId: number; customerId: number | null; programId: number | null },
  extras: Record<string, string>,
): string {
  const params = new URLSearchParams({ cycle: String(scope.cycleId), ...extras });
  if (scope.customerId != null) params.set("customer", String(scope.customerId));
  if (scope.programId != null) params.set("program", String(scope.programId));
  return `/review?${params.toString()}`;
}

/**
 * Ops control tower: cycle/client/program scope, health + KPIs, action queues,
 * and review backlog by client. Ported from `CommandCenterComponent`.
 */
export function CommandCenterView() {
  const router = useRouter();
  const cc = useCommandCenter();
  const health = healthFromCounts(
    cc.kpis?.total ?? 0,
    cc.kpis?.completion ?? 0,
    cc.kpis?.overdue ?? 0,
  );

  return (
    <div className="mx-auto max-w-[1180px] space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          title="Command Center"
          description="Everything that needs your attention this cycle, in one place."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={cc.customerId != null ? String(cc.customerId) : ALL}
            onValueChange={(v) => cc.setCustomer(v === ALL ? null : Number(v))}
          >
            <SelectTrigger className="w-[180px]" aria-label="Client">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All clients</SelectItem>
              {cc.customers.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={cc.programId != null ? String(cc.programId) : ALL}
            onValueChange={(v) => cc.setProgramId(v === ALL ? null : Number(v))}
          >
            <SelectTrigger className="w-[180px]" aria-label="Program">
              <SelectValue placeholder="All programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All programs</SelectItem>
              {cc.programs.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={cc.cycleId != null ? String(cc.cycleId) : undefined}
            onValueChange={(v) => cc.setCycleId(Number(v))}
          >
            <SelectTrigger className="w-[180px]" aria-label="Cycle">
              <SelectValue placeholder="Cycle" />
            </SelectTrigger>
            <SelectContent>
              {cc.cycles.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Refresh"
            onClick={cc.refresh}
            disabled={cc.isRefreshing || cc.scope == null}
          >
            <HugeiconsIcon icon={RefreshIcon} size={16} />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                HEALTH_CLASSES[health.tone],
              )}
            >
              {health.label}
            </span>
            <p className="text-sm text-muted-foreground">
              Cycle {cc.cycleTitle || "—"}
            </p>
          </div>
          <div className="flex min-w-[200px] flex-1 flex-col gap-1 sm:max-w-xs">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Completion</span>
              <span>{cc.kpis?.completion ?? 0}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${cc.kpis?.completion ?? 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {KPI_META.map((meta) => {
          const raw =
            cc.kpis == null
              ? null
              : meta.key === "completion"
                ? cc.kpis.completion
                : cc.kpis[meta.key];
          return (
            <Card
              key={meta.key}
              className={cn("border", VARIANT_CLASSES[meta.variant])}
            >
              <CardContent className="pt-4">
                <p className="text-xs font-medium opacity-80">{meta.label}</p>
                {cc.isLoading || raw == null ? (
                  <Skeleton className="mt-2 h-7 w-16" />
                ) : (
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {"format" in meta && meta.format
                      ? meta.format(raw)
                      : raw.toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {cc.queues.map((queue) => (
          <Card key={queue.id} className={cn("border-l-4", QUEUE_ACCENT[queue.accent])}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">{queue.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{queue.hint}</p>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
                {queue.count}
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              {cc.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : queue.results.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">All clear</p>
              ) : (
                <ul className="divide-y">
                  {queue.results.map((job) => (
                    <li key={job.id}>
                      <button
                        type="button"
                        className="flex w-full flex-col gap-0.5 py-2 text-left text-sm hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => router.push(`/review?job=${job.id}`)}
                      >
                        <span className="truncate font-medium">{storeLabel(job)}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {[job.customer?.title, closesLabel(job)].filter(Boolean).join(" · ")}
                          {" · "}
                          {assigneeLabel(job)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={cc.scope == null || cc.isLoading || queue.count === 0}
                onClick={() => {
                  if (!cc.scope) return;
                  const extras: Record<string, string> =
                    queue.id === "review"
                      ? { status: "pending" }
                      : queue.id === "overdue"
                        ? { overdue: "true" }
                        : { unassigned: "true" };
                  router.push(reviewQuery(cc.scope, extras));
                }}
              >
                View all in Review
              </Button>
            </CardContent>
          </Card>
        ))}

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Review backlog by client</CardTitle>
            <p className="text-sm text-muted-foreground">
              Submitted visits awaiting review, grouped by brand.
            </p>
          </CardHeader>
          <CardContent>
            {cc.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : cc.pendingEntries.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No visits awaiting review
              </p>
            ) : (
              <ul className="divide-y">
                {cc.pendingEntries.map((entry) => (
                  <li key={entry.customer_id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 py-2 text-left text-sm hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => {
                        if (!cc.scope) return;
                        router.push(
                          reviewQuery(cc.scope, {
                            customer: String(entry.customer_id),
                            status: "pending",
                          }),
                        );
                      }}
                    >
                      <span className="truncate">{entry.customer_title}</span>
                      <span className="shrink-0 rounded-full bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-700">
                        {entry.visits_count} visit{entry.visits_count === 1 ? "" : "s"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
