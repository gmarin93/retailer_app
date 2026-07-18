"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { LoadingState } from "@/shared/components/loading-state";
import { chartTheme } from "@/shared/lib/theme";
import { usePlansChart } from "../hooks";
import type { PlansChartRequest } from "../schemas";

const HOURS_COLORS = ["#60D4B1", "#1EAE82", "#049469", "#0B7A57", "#86E6C8"];
const BUDGET_UNDER = ["#DDDDDD", "#60D4B1", "#1EAE82", "#049469"];
const BUDGET_OVER_FIRST = "#F29137";

interface PlanningChartsProps {
  scope: PlansChartRequest | null;
  canSetBudget?: boolean;
  onSetBudget?: () => void;
}

export function PlanningCharts({
  scope,
  canSetBudget = false,
  onSetBudget,
}: PlanningChartsProps) {
  const chartQuery = usePlansChart(scope);

  if (scope == null) return null;

  const hours = chartQuery.data?.hours_data ?? [];
  const budget = chartQuery.data?.budget_data ?? [];
  const overBudget = chartQuery.data?.over_budget ?? false;
  const budgetColors = overBudget
    ? [BUDGET_OVER_FIRST, ...BUDGET_UNDER.slice(1)]
    : BUDGET_UNDER;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Planning charts</CardTitle>
        <div className="flex items-center gap-2">
          {overBudget && (
            <span className="text-xs font-medium text-amber-700">Over budget</span>
          )}
          {canSetBudget && onSetBudget && (
            <Button type="button" variant="outline" size="sm" onClick={onSetBudget}>
              Set budget
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {chartQuery.isLoading ? (
          <LoadingState label="Loading charts…" className="min-h-48" />
        ) : hours.length === 0 && budget.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No chart data for this selection.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Hours</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={hours}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {hours.map((entry, index) => (
                        <Cell
                          key={`hours-${entry.name}-${index}`}
                          fill={HOURS_COLORS[index % HOURS_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTheme.tooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1 text-xs">
                {hours.map((slice, index) => (
                  <li key={`hours-legend-${slice.name}`} className="flex justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate">
                      <span
                        className="inline-block size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: HOURS_COLORS[index % HOURS_COLORS.length],
                        }}
                      />
                      {slice.name}
                    </span>
                    <span className="text-muted-foreground">
                      {slice.value.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Budget</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={budget}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {budget.map((entry, index) => (
                        <Cell
                          key={`budget-${entry.name}-${index}`}
                          fill={budgetColors[index % budgetColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTheme.tooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1 text-xs">
                {budget.map((slice, index) => (
                  <li key={`budget-legend-${slice.name}`} className="flex justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate">
                      <span
                        className="inline-block size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: budgetColors[index % budgetColors.length],
                        }}
                      />
                      {slice.name}
                    </span>
                    <span className="text-muted-foreground">
                      {slice.value.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
