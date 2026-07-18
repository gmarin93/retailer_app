"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { chartTheme } from "@/shared/lib/theme";
import { cn } from "@/shared/lib/utils";
import type { ListableCustomer } from "@/shared/services/entities/customers";
import type { CycleScope, DashboardFilters, useFillRateChart } from "../hooks";
import {
  CHART_SERIES_COLOR,
  CHART_SERIES_KEYS,
  CHART_SERIES_LABEL,
  SERIES_TO_REVIEW_STATUS,
  type ChartSeriesKey,
} from "../schemas";

const ALL_YEARS = "all";

export function FillRateChartCard({
  scope,
  filters,
  chart,
  customers,
}: {
  scope: CycleScope;
  filters: DashboardFilters;
  chart: ReturnType<typeof useFillRateChart>;
  customers: ListableCustomer[];
}) {
  const router = useRouter();
  /** Series toggled off via the legend (Note 172). */
  const [hiddenSeries, setHiddenSeries] = useState<Set<ChartSeriesKey>>(new Set());

  const toggleSeries = (key: ChartSeriesKey) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /**
   * Bar drill-down (byClient only): /review filtered by client + status
   * (Note 172 — "click on each reference to filter").
   */
  const onBarClick = (seriesKey: ChartSeriesKey, clientName: string) => {
    if (filters.view !== "byClient") return;
    const customer = customers.find((c) => c.title === clientName);
    if (!customer) return;
    const params = new URLSearchParams({
      customer: String(customer.id),
      status: SERIES_TO_REVIEW_STATUS[seriesKey],
    });
    if (scope.currentCycle) params.set("cycle", String(scope.currentCycle.id));
    router.push(`/review?${params.toString()}`);
  };

  const toggleCycle = (id: number) => {
    filters.setSelectedCycleIds(
      filters.selectedCycleIds.includes(id)
        ? filters.selectedCycleIds.filter((c) => c !== id)
        : [...filters.selectedCycleIds, id],
    );
  };

  const toggleCustomer = (id: number) => {
    filters.setSelectedCustomerIds(
      filters.selectedCustomerIds.includes(id)
        ? filters.selectedCustomerIds.filter((c) => c !== id)
        : [...filters.selectedCustomerIds, id],
    );
  };

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Fill rate</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filters.view}
              onValueChange={(value) => filters.setView(value as "byClient" | "byMonth")}
            >
              <SelectTrigger size="sm" aria-label="Chart view">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="byClient">By client</SelectItem>
                <SelectItem value="byMonth">By month</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.year === null ? ALL_YEARS : String(filters.year)}
              onValueChange={(value) =>
                filters.setYear(value === ALL_YEARS ? null : Number(value))
              }
            >
              <SelectTrigger size="sm" aria-label="Year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_YEARS}>All years</SelectItem>
                {scope.availableYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {filters.selectedCycleIds.length > 0
                    ? `Cycles (${filters.selectedCycleIds.length})`
                    : "Cycles"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto">
                <DropdownMenuLabel>Cycles</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {scope.visibleCycles.map((cycle) => (
                  <DropdownMenuCheckboxItem
                    key={cycle.id}
                    checked={filters.selectedCycleIds.includes(cycle.id)}
                    onCheckedChange={() => toggleCycle(cycle.id)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {cycle.title}
                  </DropdownMenuCheckboxItem>
                ))}
                {scope.hasMoreCycles && (
                  <>
                    <DropdownMenuSeparator />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => filters.setShowAllCycles(!filters.showAllCycles)}
                    >
                      {filters.showAllCycles ? "Show fewer" : "More options"}
                    </Button>
                  </>
                )}
                {filters.selectedCycleIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => filters.setSelectedCycleIds([])}
                  >
                    Clear
                  </Button>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {filters.selectedCustomerIds.length > 0
                    ? `Clients (${filters.selectedCustomerIds.length})`
                    : "Clients"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
                <DropdownMenuLabel>Clients</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {customers.map((customer) => (
                  <DropdownMenuCheckboxItem
                    key={customer.id}
                    checked={filters.selectedCustomerIds.includes(customer.id)}
                    onCheckedChange={() => toggleCustomer(customer.id)}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {customer.title}
                  </DropdownMenuCheckboxItem>
                ))}
                {filters.selectedCustomerIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => filters.setSelectedCustomerIds([])}
                  >
                    Clear
                  </Button>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4" aria-label="Chart legend">
          {CHART_SERIES_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleSeries(key)}
              aria-pressed={!hiddenSeries.has(key)}
              className={cn(
                "flex items-center gap-2 text-sm",
                hiddenSeries.has(key) && "line-through opacity-40",
              )}
            >
              <span
                aria-hidden="true"
                className="size-3 rounded-full"
                style={{ backgroundColor: CHART_SERIES_COLOR[key] }}
              />
              {CHART_SERIES_LABEL[key]}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {chart.isLoading ? (
          <LoadingState label="Loading chart…" className="h-80" />
        ) : chart.isError ? (
          <ErrorState
            error={chart.error}
            onRetry={() => chart.refetch()}
            className="h-80 p-6"
          />
        ) : (chart.data ?? []).length === 0 ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            No data available for the selected filters.
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart.data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={chartTheme.gridStroke}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: chartTheme.tickFill }}
                  interval={0}
                  angle={-30}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={{ fontSize: 12, fill: chartTheme.tickFill }} />
                <Tooltip
                  contentStyle={chartTheme.tooltip}
                  formatter={(value, name) => [`${Math.round(Number(value))}h`, name]}
                />
                {CHART_SERIES_KEYS.filter((key) => !hiddenSeries.has(key)).map((key) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={CHART_SERIES_LABEL[key]}
                    fill={CHART_SERIES_COLOR[key]}
                    radius={[4, 4, 0, 0]}
                    cursor={filters.view === "byClient" ? "pointer" : undefined}
                    onClick={(data) => {
                      const name = (data as { name?: string }).name;
                      if (name) onBarClick(key, name);
                    }}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
