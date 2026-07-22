"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSession } from "@/features/auth/hooks";
import { formatUserName } from "@/features/auth/schemas";
import { PageHeader } from "@/shared/components/page-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useFieldRepVisitCounts } from "../hooks";
import { ActiveAnnouncementsSection } from "./active-announcements-section";
import { AnalyticsSummaryCard } from "./analytics-summary-card";
import { RepContactsCard } from "./rep-contacts-card";
import { VisitStatusCards } from "./visit-status-cards";

const VisitCharts = dynamic(
  () =>
    import("./visit-charts").then((mod) => ({
      default: ({ counts }: { counts: Parameters<typeof mod.VisitsBarChart>[0]["counts"] }) => (
        <div className="grid gap-6 lg:grid-cols-2">
          <mod.VisitsBarChart counts={counts} />
          <mod.VisitsPieChart counts={counts} />
        </div>
      ),
    })),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    ),
  },
);

export function FieldRepDashboard() {
  const session = useSession();
  const countsQuery = useFieldRepVisitCounts();

  const userName = session ? formatUserName(session.user) : "";
  const counts = countsQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome${userName ? `, ${userName}` : ""}!`}
        actions={
          <Link
            href="/itinerary"
            className="flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            View Itinerary
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          </Link>
        }
      />

      <ActiveAnnouncementsSection />

      <VisitStatusCards counts={counts} isLoading={countsQuery.isLoading} />

      <AnalyticsSummaryCard counts={counts} isLoading={countsQuery.isLoading} />

      {counts && !countsQuery.isLoading && <VisitCharts counts={counts} />}
      {countsQuery.isLoading && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      )}

      <RepContactsCard />
    </div>
  );
}
