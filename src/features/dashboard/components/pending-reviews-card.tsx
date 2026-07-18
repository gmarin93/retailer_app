"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { PendingReviewsEntry } from "../schemas";

const PREVIEW_LIMIT = 6;

export function PendingReviewsCard({
  entries,
  cycleTitle,
  cycleIds,
  isLoading,
}: {
  entries: PendingReviewsEntry[];
  cycleTitle: string;
  cycleIds: number[];
  isLoading: boolean;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  /** Drill-down: /review filtered by client + pending status (+ cycle scope). */
  const openReview = (entry: PendingReviewsEntry) => {
    const params = new URLSearchParams({
      customer: String(entry.customer_id),
      status: "pending",
    });
    if (cycleIds.length > 0) params.set("cycle", cycleIds.join(","));
    router.push(`/review?${params.toString()}`);
  };

  const cycleLabel = cycleTitle && cycleIds.length === 1 ? `cycle ${cycleTitle}` : cycleTitle;

  const list = (items: PendingReviewsEntry[]) => (
    <ul className="divide-y">
      {items.map((entry) => (
        <li key={entry.customer_id}>
          <button
            type="button"
            onClick={() => openReview(entry)}
            className="flex w-full items-center justify-between gap-4 py-2 text-left text-sm hover:bg-accent/50"
          >
            <span className="truncate">{entry.customer_title}</span>
            <span className="shrink-0 rounded-full border border-pink-600 bg-pink-600 px-2 py-0.5 text-xs font-medium text-white dark:border-pink-200/50 dark:bg-pink-100 dark:text-black">
              {entry.visits_count} visit{entry.visits_count === 1 ? "" : "s"}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visits pending review</CardTitle>
        {cycleLabel && <p className="text-sm text-muted-foreground">{cycleLabel}</p>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No visits pending review.
          </p>
        ) : (
          <>
            {list(entries.slice(0, PREVIEW_LIMIT))}
            {entries.length > PREVIEW_LIMIT && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full"
                onClick={() => setDialogOpen(true)}
              >
                View all ({entries.length})
              </Button>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Visits pending review</DialogTitle>
            {cycleLabel && <DialogDescription>{cycleLabel}</DialogDescription>}
          </DialogHeader>
          {list(entries)}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
