import { env } from "@/shared/lib/env";
import { api } from "@/shared/services/api";
import {
  FETCH_ALL_PAGE_SIZE,
  fetchAllPages,
  resultsPageSchema,
} from "@/shared/services/api/pagination";
import {
  listableCustomerSchema,
  type ListableCustomer,
} from "@/shared/services/entities/customers";
import {
  calendarResponseSchema,
  chartFillRateSchema,
  emptyMonths,
  remindersResponseSchema,
  reminderSchema,
  reviewableJobSchema,
  shapeHoursByClient,
  shapeMonthlyChart,
  type DashboardReminder,
  type DaySummaries,
  type MonthlyHoursDatum,
  type ReviewableJob,
} from "./schemas";

/**
 * Customer-portal dashboard data, ported from
 * `dashboard-customer.component.ts`. Everything is scoped to the customer
 * account's assigned clients (`customers/reviewable/`).
 */

const v2 = `${env.apiHost}/v2`;

const customerPageSchema = resultsPageSchema(listableCustomerSchema);
const jobPageSchema = resultsPageSchema(reviewableJobSchema);

/** Assigned clients only, ordered by title (`getAllReviewableCustomersByTitle`). */
export async function fetchReviewableCustomersByTitle(
  signal?: AbortSignal,
): Promise<ListableCustomer[]> {
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${v2}/customers/reviewable/`, {
      searchParams: { _order: "title", _page: page, _page_size: FETCH_ALL_PAGE_SIZE },
      signal,
    });
    return customerPageSchema.parse(data);
  });
}

/** Complete+invoiced hours filter for a year window. */
function completeHoursParams(customerIds: number[], year: number) {
  return {
    program__customer__id__in: customerIds.join(","),
    visit__opens_at__gte: `${year}-01-01`,
    visit__closes_at__lte: `${year}-12-31`,
    status__in: "completed,invoiced",
  };
}

/** "Complete hours by month" chart for one client + year. */
export async function fetchMonthlyCompleteHours(
  customerId: number,
  year: number,
  signal?: AbortSignal,
): Promise<MonthlyHoursDatum[]> {
  try {
    const data = await api.get<unknown>(`${v2}/jobs/chart_fill_rate/`, {
      searchParams: { ...completeHoursParams([customerId], year), group_by: "month" },
      signal,
    });
    return shapeMonthlyChart(chartFillRateSchema.parse(data));
  } catch {
    return emptyMonths();
  }
}

/** Complete hours per assigned client for the year (no month grouping). */
export async function fetchHoursByClient(
  customerIds: number[],
  year: number,
  signal?: AbortSignal,
): Promise<MonthlyHoursDatum[]> {
  if (customerIds.length === 0) return [];
  const data = await api.get<unknown>(`${v2}/jobs/chart_fill_rate/`, {
    searchParams: completeHoursParams(customerIds, year),
    signal,
  });
  return shapeHoursByClient(chartFillRateSchema.parse(data));
}

// -- Calendar ---------------------------------------------------------------

async function fetchReviewableJobs(
  searchParams: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<ReviewableJob[]> {
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${v2}/jobs/reviewable/`, {
      searchParams: { ...searchParams, _page: page, _page_size: FETCH_ALL_PAGE_SIZE },
      signal,
    });
    return jobPageSchema.parse(data);
  });
}

/** UTC calendar day for a visit — matches how visit dates render elsewhere. */
function calendarBucketKey(job: ReviewableJob): string | null {
  const dueKey = () => {
    const due = job.visit?.closes_at ?? job.visit?.opens_at;
    return due ? new Date(due).toISOString().slice(0, 10) : null;
  };
  if (job.status === "pending") return dueKey();
  if (job.status === "completed" || job.status === "invoiced") {
    if (job.completed_on) return new Date(job.completed_on).toISOString().slice(0, 10);
    return dueKey();
  }
  return null;
}

/**
 * Per-day review counts for one month + client.
 *
 * Completed counts come from `dashboard/calendar/` when it returns data;
 * otherwise they are derived from reviewable jobs in the range. Pending
 * (Submitted) counts always come from the reviewable pending jobs — the same
 * visits shown on the Review page for this client.
 */
export async function fetchCalendarSummaries(
  rangeFrom: string,
  rangeTo: string,
  customerId: number,
  signal?: AbortSignal,
): Promise<DaySummaries> {
  const summaries: DaySummaries = {};
  const bump = (key: string, field: keyof DaySummaries[string]) => {
    const entry = (summaries[key] ??= { completeReviews: 0, reviewsPending: 0 });
    entry[field] += 1;
  };

  const pendingJobsPromise = fetchReviewableJobs(
    { program__customer__id__in: customerId, status__in: "pending" },
    signal,
  ).catch(() => [] as ReviewableJob[]);

  let apiDaysApplied = false;
  try {
    const data = await api.get<unknown>(`${v2}/dashboard/calendar/`, {
      searchParams: { from: rangeFrom, to: rangeTo, customer: customerId },
      signal,
    });
    const parsed = calendarResponseSchema.parse(data);
    const hasReviewData = parsed.days.some(
      (d) => d.complete_reviews > 0 || d.reviews_pending > 0,
    );
    if (hasReviewData && parsed.days.length > 0) {
      for (const day of parsed.days) {
        summaries[day.date] = {
          completeReviews: day.complete_reviews,
          reviewsPending: day.reviews_pending,
        };
      }
      apiDaysApplied = true;
    }
  } catch {
    // Aggregated endpoint missing — fall through to the jobs-based fallback.
  }

  if (!apiDaysApplied) {
    const jobs = await fetchReviewableJobs(
      {
        program__customer__id__in: customerId,
        visit__opens_at__gte: rangeFrom,
        visit__closes_at__lte: rangeTo,
        status__in: "pending,completed,invoiced",
      },
      signal,
    ).catch(() => [] as ReviewableJob[]);

    for (const job of jobs) {
      const key = calendarBucketKey(job);
      if (!key || key < rangeFrom || key > rangeTo) continue;
      if (job.status === "completed" || job.status === "invoiced") {
        bump(key, "completeReviews");
      } else if (job.status === "pending") {
        bump(key, "reviewsPending");
      }
    }
  }

  // Pending counts are always recomputed from submitted visits.
  for (const key of Object.keys(summaries)) {
    summaries[key]!.reviewsPending = 0;
  }
  const pendingJobs = await pendingJobsPromise;
  for (const job of pendingJobs) {
    if (job.status !== "pending") continue;
    const key = calendarBucketKey(job);
    if (!key || key < rangeFrom || key > rangeTo) continue;
    bump(key, "reviewsPending");
  }

  return summaries;
}

// -- Reminders --------------------------------------------------------------

export async function fetchReminders(
  rangeFrom: string,
  rangeTo: string,
  customerId: number | undefined,
  signal?: AbortSignal,
): Promise<DashboardReminder[]> {
  try {
    const data = await api.get<unknown>(`${v2}/dashboard/reminders/`, {
      searchParams: { from: rangeFrom, to: rangeTo, customer: customerId },
      signal,
    });
    return remindersResponseSchema.parse(data).results;
  } catch {
    return [];
  }
}

export interface ReminderCreate {
  customer: number;
  date: string;
  text: string;
}

export async function createReminder(payload: ReminderCreate): Promise<DashboardReminder> {
  const data = await api.post<unknown>(`${v2}/dashboard/reminders/`, payload);
  return reminderSchema.parse(data);
}

// -- Reminder bell (pending / dismiss) --------------------------------------

/** Reminders due today or overdue and not yet dismissed. */
export async function fetchPendingReminders(
  signal?: AbortSignal,
): Promise<DashboardReminder[]> {
  try {
    const data = await api.get<unknown>(`${v2}/dashboard/reminders/pending/`, { signal });
    return remindersResponseSchema.parse(data).results;
  } catch {
    return [];
  }
}

export async function dismissReminder(id: number): Promise<void> {
  await api.post(`${v2}/dashboard/reminders/${id}/dismiss/`);
}

export async function dismissAllReminders(): Promise<void> {
  await api.post(`${v2}/dashboard/reminders/dismiss_all/`);
}
