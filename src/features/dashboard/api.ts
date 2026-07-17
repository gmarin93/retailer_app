import { env } from "@/shared/lib/env";
import { api, ApiError } from "@/shared/services/api";
import {
  FETCH_ALL_PAGE_SIZE,
  fetchAllPages,
  resultsPageSchema,
} from "@/shared/services/api/pagination";
import {
  chartFillRateSchema,
  dashboardStatsSchema,
  dedupePlanDocumentsByTitle,
  detailedPlanSchema,
  listablePlanSchema,
  pendingReviewsResponseSchema,
  planDocumentsResponseSchema,
  reviewableJobSchema,
  shapeChartData,
  totalHoursResponseSchema,
  type ChartDatum,
  type DashboardStats,
  type PendingReviewsEntry,
  type PlanDocument,
  type TotalHoursEntry,
  type TotalHoursStatus,
} from "./schemas";

const v2 = `${env.apiHost}/v2`;

/** Comma-joined id list for DRF `__in` filters, or undefined when empty. */
function joinIds(ids: number[]): string | undefined {
  return ids.length > 0 ? ids.join(",") : undefined;
}

// -- Fill-rate chart --------------------------------------------------------

export interface ChartFilter {
  cycleIds: number[];
  customerIds: number[];
  groupBy?: "month";
}

export async function fetchFillRateChart(
  filter: ChartFilter,
  signal?: AbortSignal,
): Promise<ChartDatum[]> {
  const data = await api.get<unknown>(`${v2}/jobs/chart_fill_rate/`, {
    searchParams: {
      cycle__id__in: joinIds(filter.cycleIds),
      program__customer__id__in: joinIds(filter.customerIds),
      group_by: filter.groupBy,
    },
    signal,
  });
  return shapeChartData(chartFillRateSchema.parse(data));
}

// -- Stats (top cards) ------------------------------------------------------

/** Count of a paginated list endpoint without pulling its rows. */
async function fetchListCount(
  route: string,
  searchParams: Record<string, string | number | undefined>,
  signal?: AbortSignal,
): Promise<number> {
  try {
    const data = await api.get<{ count?: number }>(`${v2}/${route}/`, {
      searchParams: { ...searchParams, _page_size: 1 },
      signal,
    });
    return typeof data.count === "number" ? data.count : 0;
  } catch {
    return 0;
  }
}

/**
 * Aggregated `dashboard/stats/` with the Angular fallback: when the endpoint
 * is missing, compose the four numbers from list-endpoint counts
 * (reps are `users` with `rep_no__gte=0`, mirroring `UserFilter.is_rep`).
 */
export async function fetchDashboardStats(signal?: AbortSignal): Promise<DashboardStats> {
  try {
    const data = await api.get<unknown>(`${v2}/dashboard/stats/`, { signal });
    return dashboardStatsSchema.parse(data);
  } catch {
    const [teamMembers, clients, complete, pending] = await Promise.all([
      fetchListCount("users", { rep_no__gte: 0 }, signal),
      fetchListCount("customers", {}, signal),
      fetchListCount("jobs", { status__in: "completed" }, signal),
      fetchListCount("jobs", { status__in: "pending" }, signal),
    ]);
    return {
      team_members_count: teamMembers,
      clients_count: clients,
      complete_reviews_count: complete,
      review_pending_count: pending,
    };
  }
}

// -- Total hours by clients -------------------------------------------------

export interface TotalHoursResult {
  entries: TotalHoursEntry[];
  cycleTitle: string;
  /** True when the aggregated endpoint is missing (404/501) and the caller
   * should derive entries from the chart instead. */
  endpointMissing: boolean;
}

export async function fetchTotalHoursByClients(
  cycleId: number,
  status: TotalHoursStatus,
  signal?: AbortSignal,
): Promise<TotalHoursResult> {
  try {
    const data = await api.get<unknown>(`${v2}/dashboard/total_hours_by_clients/`, {
      searchParams: { cycle: cycleId, status },
      signal,
    });
    const parsed = totalHoursResponseSchema.parse(data);
    return { entries: parsed.entries, cycleTitle: parsed.cycle_title, endpointMissing: false };
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 501)) {
      return { entries: [], cycleTitle: "", endpointMissing: true };
    }
    throw error;
  }
}

/** Chart-derived fallback for the total-hours card (endpoint missing). */
export function deriveTotalHoursFromChart(
  chartData: ChartDatum[],
  status: TotalHoursStatus,
): TotalHoursEntry[] {
  return chartData
    .map((datum, index) => ({
      customer_id: index,
      customer_title: datum.name,
      hours: datum[status],
    }))
    .sort((a, b) => b.hours - a.hours);
}

// -- Pending reviews by client ----------------------------------------------

export interface PendingReviewsResult {
  entries: PendingReviewsEntry[];
  cycleTitle: string;
}

const reviewableJobPageSchema = resultsPageSchema(reviewableJobSchema);

/**
 * Fallback aggregation from `jobs/reviewable/`: submitted (`pending`) visits
 * grouped by customer, sorted by count. Reviewed / in-progress are excluded.
 */
async function aggregatePendingFromReviewableJobs(
  cycleIds: number[],
  signal?: AbortSignal,
): Promise<PendingReviewsEntry[]> {
  const jobs = await fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${v2}/jobs/reviewable/`, {
      searchParams: {
        status__in: "pending",
        cycle__id__in: joinIds(cycleIds),
        _page: page,
        _page_size: FETCH_ALL_PAGE_SIZE,
      },
      signal,
    });
    return reviewableJobPageSchema.parse(data);
  });

  const counts = new Map<number, PendingReviewsEntry>();
  for (const job of jobs) {
    if (job.status !== "pending" || job.customer?.id == null) continue;
    const existing = counts.get(job.customer.id);
    if (existing) {
      existing.visits_count += 1;
    } else {
      counts.set(job.customer.id, {
        customer_id: job.customer.id,
        customer_title: job.customer.title || "Unknown client",
        visits_count: 1,
      });
    }
  }
  return Array.from(counts.values()).sort((a, b) => b.visits_count - a.visits_count);
}

/**
 * Pending reviews grouped by client. Single cycle: try the aggregated endpoint
 * first, fall back to reviewable-jobs aggregation. Multiple cycles: the
 * aggregated endpoint is single-cycle, so aggregate directly.
 */
export async function fetchPendingReviewsByCustomer(
  cycleIds: number[],
  fallbackCycleTitle: string,
  signal?: AbortSignal,
): Promise<PendingReviewsResult> {
  if (cycleIds.length === 1) {
    try {
      const data = await api.get<unknown>(`${v2}/dashboard/pending_reviews_by_customers/`, {
        searchParams: { cycle: cycleIds[0] },
        signal,
      });
      const parsed = pendingReviewsResponseSchema.parse(data);
      return { entries: parsed.entries, cycleTitle: parsed.cycle_title || fallbackCycleTitle };
    } catch {
      // Aggregated endpoint missing or failed — fall through to aggregation.
    }
  }
  const entries = await aggregatePendingFromReviewableJobs(cycleIds, signal);
  return { entries, cycleTitle: fallbackCycleTitle };
}

// -- Plan documents ---------------------------------------------------------

export interface PlanDocumentsOptions {
  /** Cycle scope for the card preview. Omitted for the historical view-all. */
  cycleId?: number;
  /** Customer (brand) scope — customer portal. */
  customerId?: number;
  /** Preview cap. Omitted for the historical view-all list. */
  limit?: number;
}

/** Bounded concurrency when fanning out to per-plan detail requests. */
const PLAN_DETAIL_CONCURRENCY = 5;

const planPageSchema = resultsPageSchema(listablePlanSchema);

/**
 * Resolves plan documents straight from plans (never from visits): lists plans
 * scoped by cycle/customer, then loads details (with `documents`) only for
 * plans that actually have attachments. Ported from `fetchPlanDocumentsDirect`.
 */
async function fetchPlanDocumentsDirect(
  options: PlanDocumentsOptions,
  signal?: AbortSignal,
): Promise<PlanDocument[]> {
  const plans = await fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${v2}/plans/`, {
      searchParams: {
        cycle__id__in: options.cycleId,
        program__customer__id__in: options.customerId,
        _page: page,
        _page_size: FETCH_ALL_PAGE_SIZE,
      },
      signal,
    });
    return planPageSchema.parse(data);
  });

  const planIds = plans.filter((plan) => plan.num_documents > 0).map((plan) => plan.id);
  if (planIds.length === 0) return [];

  const documents: PlanDocument[] = [];
  for (let i = 0; i < planIds.length; i += PLAN_DETAIL_CONCURRENCY) {
    const batch = planIds.slice(i, i + PLAN_DETAIL_CONCURRENCY);
    const details = await Promise.all(
      batch.map((id) =>
        api
          .get<unknown>(`${v2}/plans/${id}/`, { signal })
          .then((data) => detailedPlanSchema.parse(data))
          .catch(() => null),
      ),
    );
    for (const detail of details) {
      for (const doc of detail?.documents ?? []) {
        documents.push({
          id: doc.id,
          title: doc.title,
          file_type: doc.file_type,
          size_bytes: 0,
          download_url: doc.location,
        });
      }
    }
  }
  return documents;
}

/**
 * Single entry point for the "Plan documents" card and its dialog. Tries the
 * aggregated dashboard endpoint first, falls back to resolving documents
 * directly from plans (cycle/customer scoped), never from visits. Results are
 * deduped by title; `limit` caps the final list.
 */
export async function fetchPlanDocuments(
  options: PlanDocumentsOptions,
  signal?: AbortSignal,
): Promise<PlanDocument[]> {
  try {
    let results: PlanDocument[] = [];
    try {
      const data = await api.get<unknown>(`${v2}/dashboard/plan_documents/`, {
        searchParams: {
          cycle: options.cycleId,
          customer: options.customerId,
          limit: options.limit,
        },
        signal,
      });
      results = planDocumentsResponseSchema.parse(data).results;
    } catch {
      // Aggregated endpoint missing — resolved via the direct fallback below.
    }

    let docs = dedupePlanDocumentsByTitle(
      results.length > 0 ? results : await fetchPlanDocumentsDirect(options, signal),
    );
    if (options.limit != null) {
      docs = docs.slice(0, options.limit);
    }
    return docs;
  } catch {
    return [];
  }
}
