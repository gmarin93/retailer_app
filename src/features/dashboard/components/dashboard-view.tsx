"use client";

import { DashboardSquare01Icon } from "@hugeicons/core-free-icons";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useSession } from "@/features/auth/hooks";
import { UserRole } from "@/features/auth/types";
import { FieldRepDashboard } from "@/features/field-rep-dashboard/components/field-rep-dashboard";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import {
  useAvailableCustomers,
  useCycleScope,
  useDashboardFilters,
  useDashboardStats,
  useFillRateChart,
  usePendingReviews,
  usePlanDocuments,
  useTotalHours,
} from "../hooks";
import type { TotalHoursStatus } from "../schemas";
import { CustomerDashboard } from "./customer-dashboard";
import { PendingReviewsCard } from "./pending-reviews-card";
import { PlanDocumentsCard } from "./plan-documents-card";
import { StatCards } from "./stat-cards";
import { TotalHoursCard } from "./total-hours-card";
import { Skeleton } from "@/shared/components/ui/skeleton";

/** Deferred: recharts stays out of the dashboard's initial bundle. */
const FillRateChartCard = dynamic(
  () => import("./fill-rate-chart-card").then((mod) => mod.FillRateChartCard),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full rounded-xl" /> },
);

/** Supervisor/operations dashboard (sys admin + operations roles). */
function SupervisorDashboard() {
  const filters = useDashboardFilters();
  const scope = useCycleScope(filters);
  const stats = useDashboardStats();
  const customers = useAvailableCustomers();
  const chart = useFillRateChart(scope, filters);
  const [totalHoursStatus, setTotalHoursStatus] = useState<TotalHoursStatus>("complete");
  const totalHours = useTotalHours(scope, totalHoursStatus, chart);
  const pendingReviews = usePendingReviews(scope);
  const planDocuments = usePlanDocuments(scope);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />
      <StatCards stats={stats.data} isLoading={stats.isLoading} />
      <FillRateChartCard
        scope={scope}
        filters={filters}
        chart={chart}
        customers={customers.data ?? []}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <TotalHoursCard
          entries={totalHours.entries}
          cycleTitle={totalHours.cycleTitle}
          isLoading={totalHours.isLoading}
          status={totalHoursStatus}
          onStatusChange={setTotalHoursStatus}
        />
        <PendingReviewsCard
          entries={pendingReviews.entries}
          cycleTitle={pendingReviews.cycleTitle}
          cycleIds={pendingReviews.cycleIds}
          isLoading={pendingReviews.isLoading}
        />
        <PlanDocumentsCard
          documents={planDocuments.data ?? []}
          isLoading={planDocuments.isLoading}
        />
      </div>
    </div>
  );
}

/**
 * Role switch, mirroring the Angular `DashboardComponent` getters:
 * sys admin / operations → supervisor dashboard; customer accounts → customer
 * dashboard (not yet migrated); other roles → empty dashboard.
 */
export function DashboardView() {
  const session = useSession();
  if (!session) return null;

  const role = session.user.role;

  if (role === UserRole.SYS_ADMIN || role === UserRole.OPERATIONS) {
    return <SupervisorDashboard />;
  }

  if (role === UserRole.CUSTOMER_ACCOUNT) {
    return <CustomerDashboard />;
  }

  if (role === UserRole.FIELD_REP) {
    return <FieldRepDashboard />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />
      <EmptyState
        icon={DashboardSquare01Icon}
        title="Welcome to Powerhouse"
        description="Use the navigation to get to your work."
      />
    </div>
  );
}
