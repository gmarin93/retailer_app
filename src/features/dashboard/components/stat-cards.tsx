"use client";

import {
  CheckmarkCircle02Icon,
  Clock01Icon,
  UserGroupIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import type { DashboardStats } from "../schemas";

interface StatCardDef {
  id: "team" | "clients" | "complete" | "pending";
  label: string;
  icon: IconSvgElement;
  className: string;
  value: (stats: DashboardStats) => number;
  /** `/review` status filter applied when the card is clicked. */
  reviewStatus?: string;
}

const STAT_CARDS: StatCardDef[] = [
  {
    id: "team",
    label: "Team members",
    icon: UserGroupIcon,
    className: "bg-teal-50 text-teal-700",
    value: (stats) => stats.team_members_count,
  },
  {
    id: "clients",
    label: "Clients",
    icon: UserMultipleIcon,
    className: "bg-violet-50 text-violet-700",
    value: (stats) => stats.clients_count,
  },
  {
    id: "complete",
    label: "Complete review",
    icon: CheckmarkCircle02Icon,
    className: "bg-green-50 text-green-700",
    value: (stats) => stats.complete_reviews_count,
    reviewStatus: "completed",
  },
  {
    id: "pending",
    label: "Review Pending",
    icon: Clock01Icon,
    className: "bg-pink-50 text-pink-700",
    value: (stats) => stats.review_pending_count,
    reviewStatus: "pending",
  },
];

export function StatCards({
  stats,
  isLoading,
}: {
  stats?: DashboardStats;
  isLoading: boolean;
}) {
  const router = useRouter();

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {STAT_CARDS.map((card) => {
        const clickable = !!card.reviewStatus;
        return (
          <Card
            key={card.id}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={() => {
              if (card.reviewStatus) router.push(`/review?status=${card.reviewStatus}`);
            }}
            onKeyDown={(event) => {
              if (clickable && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                router.push(`/review?status=${card.reviewStatus}`);
              }
            }}
            className={cn(clickable && "cursor-pointer transition-shadow hover:shadow-md")}
          >
            <CardContent className="flex items-center gap-4">
              <div className={cn("rounded-full p-3", card.className)}>
                <HugeiconsIcon icon={card.icon} aria-hidden="true" className="size-5" />
              </div>
              <div>
                {isLoading || !stats ? (
                  <Skeleton className="mb-1 h-7 w-16" />
                ) : (
                  <p className="text-2xl font-semibold">{card.value(stats).toLocaleString()}</p>
                )}
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
