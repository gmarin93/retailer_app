"use client";

import Link from "next/link";
import {
  PlusSignIcon,
  CalendarCheckIn01Icon,
  WorkflowCircle04Icon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { VisitCounts } from "../schemas";

const STATUS_CARDS = [
  {
    key: "newVisits" as const,
    label: "New",
    icon: PlusSignIcon,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-100 dark:border-blue-900/40",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "overdue" as const,
    label: "Overdue",
    icon: CalendarCheckIn01Icon,
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-100 dark:border-red-900/40",
    iconColor: "text-red-600 dark:text-red-400",
  },
  {
    key: "inProgress" as const,
    label: "In Progress",
    icon: WorkflowCircle04Icon,
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-100 dark:border-amber-900/40",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "submitted" as const,
    label: "Complete",
    icon: CheckmarkCircle01Icon,
    bg: "bg-green-50 dark:bg-green-950/30",
    border: "border-green-100 dark:border-green-900/40",
    iconColor: "text-green-600 dark:text-green-400",
  },
] as const;

export function VisitStatusCards({
  counts,
  isLoading,
}: {
  counts: VisitCounts | undefined;
  isLoading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {STATUS_CARDS.map(({ key, label, icon, bg, border, iconColor }) => (
        <Link
          key={key}
          href="/itinerary"
          className={`flex items-center gap-3 rounded-xl border p-4 transition-opacity hover:opacity-80 ${bg} ${border}`}
        >
          <HugeiconsIcon icon={icon} className={`size-6 shrink-0 ${iconColor}`} />
          <span className="flex-1 text-base font-bold text-foreground">{label}</span>
          {isLoading ? (
            <Skeleton className="h-7 w-8" />
          ) : (
            <span className="text-xl font-bold text-foreground">
              {counts?.[key] ?? 0}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
