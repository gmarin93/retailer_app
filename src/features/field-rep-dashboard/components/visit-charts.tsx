"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { chartTheme } from "@/shared/lib/theme";
import type { VisitCounts } from "../schemas";

const STATUS_COLORS = {
  New: "#5275FF",
  Overdue: "#E57373",
  "In Progress": "#FFB74D",
  Complete: "#66BB6A",
} as const;

type StatusLabel = keyof typeof STATUS_COLORS;

function buildChartData(counts: VisitCounts) {
  return [
    { name: "New" as StatusLabel, value: counts.newVisits },
    { name: "Overdue" as StatusLabel, value: counts.overdue },
    { name: "In Progress" as StatusLabel, value: counts.inProgress },
    { name: "Complete" as StatusLabel, value: counts.submitted },
  ];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={chartTheme.tooltip} className="px-3 py-2 text-sm">
      <span className="font-medium">{payload[0]?.name}: </span>
      <span>{payload[0]?.value}</span>
    </div>
  );
}

export function VisitsBarChart({ counts }: { counts: VisitCounts }) {
  const data = buildChartData(counts);
  const maxY = Math.max(...data.map((d) => d.value), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visits by status</CardTitle>
        <p className="text-xs text-muted-foreground">
          {maxY === 0
            ? "No visits assigned yet."
            : "Overview of your visits by current status."}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: -16 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: chartTheme.tickFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: chartTheme.tickFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={STATUS_COLORS[entry.name]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: STATUS_COLORS[entry.name] }}
                />
                <span className="text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-bold" style={{ color: STATUS_COLORS[entry.name] }}>
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function VisitsPieChart({ counts }: { counts: VisitCounts }) {
  const data = buildChartData(counts).filter((d) => d.value > 0);
  const total = counts.newVisits + counts.overdue + counts.inProgress + counts.submitted;
  const completionPercent = total === 0 ? 0 : Math.round((counts.submitted / total) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visit overview</CardTitle>
        <p className="text-xs text-muted-foreground">
          {total === 0
            ? "Completion rate appears once visits are assigned."
            : `${total} total visit${total === 1 ? "" : "s"} assigned to you.`}
        </p>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
            No data yet
          </div>
        ) : (
          <>
            <div className="relative flex justify-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={74}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {data.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{completionPercent}%</span>
                <span className="text-xs text-muted-foreground">complete</span>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5">
              {buildChartData(counts).map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[entry.name] }}
                    />
                    <span className="text-muted-foreground">{entry.name}</span>
                  </div>
                  <span className="font-bold" style={{ color: STATUS_COLORS[entry.name] }}>
                    {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
