"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { deriveAnalytics } from "../schemas";
import type { VisitCounts } from "../schemas";

export function AnalyticsSummaryCard({
  counts,
  isLoading,
}: {
  counts: VisitCounts | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const analytics = deriveAnalytics(
    counts ?? { newVisits: 0, overdue: 0, inProgress: 0, submitted: 0 },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your progress</CardTitle>
        <p className="text-xs text-muted-foreground">
          {analytics.isEmpty
            ? "No visits assigned yet."
            : `${analytics.outstanding} of ${analytics.total} visit${analytics.total === 1 ? "" : "s"} still need action.`}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {analytics.completionPercent}%
            </p>
            <p className="text-xs text-muted-foreground">Completion</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {analytics.overduePercent}%
            </p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{analytics.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${analytics.completionRate * 100}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
