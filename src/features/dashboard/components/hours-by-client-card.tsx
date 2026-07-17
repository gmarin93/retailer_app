"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { MonthlyHoursDatum } from "../schemas";

/** Complete hours per assigned client for the selected year. */
export function HoursByClientCard({
  entries,
  isLoading,
  year,
}: {
  entries: MonthlyHoursDatum[];
  isLoading: boolean;
  year: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Total hours by clients</CardTitle>
        <p className="text-sm text-muted-foreground">{year}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No data available.</p>
        ) : (
          <ul className="divide-y">
            {entries.map((entry) => (
              <li
                key={entry.name}
                className="flex items-center justify-between gap-4 py-2 text-sm"
              >
                <span className="truncate">{entry.name}</span>
                <span className="shrink-0 font-medium tabular-nums">{entry.value}h</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
