"use client";

import { UserGroupIcon, UserMultipleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { PageHeader } from "@/shared/components/page-header";
import {
  useHoursByClient,
  useMonthlyCompleteHours,
  useReviewableCustomers,
} from "../customer-hooks";
import { useDashboardStats } from "../hooks";
import { emptyMonths } from "../schemas";
import { CalendarCard } from "./calendar-card";
import { CustomerPlanDocumentsCard } from "./customer-plan-documents-card";
import { HoursByClientCard } from "./hours-by-client-card";

/** Deferred: recharts stays out of the dashboard's initial bundle. */
const MonthlyHoursChartCard = dynamic(
  () => import("./monthly-hours-chart-card").then((mod) => mod.MonthlyHoursChartCard),
  { ssr: false, loading: () => <Skeleton className="h-96 w-full rounded-xl" /> },
);

/** Last five years, newest first (Angular `deriveYears`). */
function lastFiveYears(): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => current - i);
}

/**
 * Customer-portal dashboard (Figma notes 153 / 158 / 167 / 168 / 173):
 * informational stat cards, "Complete hours by month" (single client + year),
 * total hours by client, plan documents, and the reviews/reminders calendar.
 */
export function CustomerDashboard() {
  const stats = useDashboardStats();
  const customers = useReviewableCustomers();
  const [selectedCustomerId, setCustomerId] = useState<number | null>(null);
  const [year, setYear] = useState(() => new Date().getFullYear());

  // Default to the first assigned client so the chart populates immediately.
  const customerId = selectedCustomerId ?? customers.data?.[0]?.id ?? null;

  const monthlyHours = useMonthlyCompleteHours(customerId, year);
  const customerIds = (customers.data ?? []).map((c) => c.id);
  const hoursByClient = useHoursByClient(customerIds, year);

  const statCards = [
    {
      id: "team",
      label: "Team members",
      icon: UserGroupIcon,
      className: "bg-teal-50 text-teal-700",
      value: stats.data?.team_members_count,
    },
    {
      id: "clients",
      label: "Clients",
      icon: UserMultipleIcon,
      className: "bg-violet-50 text-violet-700",
      value: stats.data?.clients_count,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      <div className="grid gap-4 sm:grid-cols-2">
        {statCards.map((card) => (
          <Card key={card.id}>
            <CardContent className="flex items-center gap-4">
              <div className={`rounded-full p-3 ${card.className}`}>
                <HugeiconsIcon icon={card.icon} aria-hidden="true" className="size-5" />
              </div>
              <div>
                {card.value === undefined ? (
                  <Skeleton className="mb-1 h-7 w-16" />
                ) : (
                  <p className="text-2xl font-semibold">{card.value.toLocaleString()}</p>
                )}
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <MonthlyHoursChartCard
        data={monthlyHours.data ?? emptyMonths()}
        isLoading={monthlyHours.isLoading}
        customers={customers.data ?? []}
        customerId={customerId}
        onCustomerChange={setCustomerId}
        years={lastFiveYears()}
        year={year}
        onYearChange={setYear}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <HoursByClientCard
          entries={hoursByClient.data ?? []}
          isLoading={hoursByClient.isLoading && customerIds.length > 0}
          year={year}
        />
        <CustomerPlanDocumentsCard customerId={customerId} />
      </div>

      <CalendarCard customerId={customerId} />
    </div>
  );
}
