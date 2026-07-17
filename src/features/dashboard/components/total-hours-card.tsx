"use client";

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
import { cn } from "@/shared/lib/utils";
import type { TotalHoursEntry, TotalHoursStatus } from "../schemas";

const STATUS_TABS: { value: TotalHoursStatus; label: string }[] = [
  { value: "complete", label: "Complete" },
  { value: "overdue", label: "Overdue" },
  { value: "in_progress", label: "In progress" },
];

const PREVIEW_LIMIT = 6;

function HoursList({ entries }: { entries: TotalHoursEntry[] }) {
  return (
    <ul className="divide-y">
      {entries.map((entry) => (
        <li
          key={`${entry.customer_id}-${entry.customer_title}`}
          className="flex items-center justify-between gap-4 py-2 text-sm"
        >
          <span className="truncate">{entry.customer_title}</span>
          <span className="shrink-0 font-medium tabular-nums">{entry.hours}h</span>
        </li>
      ))}
    </ul>
  );
}

export function TotalHoursCard({
  entries,
  cycleTitle,
  isLoading,
  status,
  onStatusChange,
}: {
  entries: TotalHoursEntry[];
  cycleTitle: string;
  isLoading: boolean;
  status: TotalHoursStatus;
  onStatusChange: (status: TotalHoursStatus) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const statusLabel = STATUS_TABS.find((tab) => tab.value === status)?.label ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Total hours by clients</CardTitle>
        {cycleTitle && <p className="text-sm text-muted-foreground">Cycle {cycleTitle}</p>}
        <div role="tablist" aria-label="Hours status" className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              onClick={() => onStatusChange(tab.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                status === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
          <>
            <HoursList entries={entries.slice(0, PREVIEW_LIMIT)} />
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
            <DialogTitle>Total hours by clients</DialogTitle>
            <DialogDescription>
              {statusLabel} hours{cycleTitle ? ` — cycle ${cycleTitle}` : ""}
            </DialogDescription>
          </DialogHeader>
          <HoursList entries={entries} />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
