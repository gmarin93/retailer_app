import { z } from "zod";

/**
 * Dashboard payloads, ported from the Angular `api/v2/models/dashboard.ts` and
 * `chart_data.ts`. Several aggregated `dashboard/*` endpoints may not exist on
 * the backend yet (they 404); the hooks reproduce the Angular fallbacks that
 * derive the same data from list endpoints.
 */

// -- Fill-rate chart --------------------------------------------------------

export const chartFillRateSchema = z.object({
  data: z.array(
    z.object({
      name: z.string(),
      series: z.array(
        z.looseObject({
          name: z.string(),
          hours: z.number().catch(0),
        }),
      ),
    }),
  ),
});

export type ChartFillRateResponse = z.infer<typeof chartFillRateSchema>;

export type ChartSeriesKey = "complete" | "overdue" | "in_progress";

export const CHART_SERIES_LABEL: Record<ChartSeriesKey, string> = {
  complete: "Complete hours",
  overdue: "Overdue hours",
  in_progress: "In progress hours",
};

export const CHART_SERIES_COLOR: Record<ChartSeriesKey, string> = {
  complete: "#3cd856",
  overdue: "#fa5a7d",
  in_progress: "#ff947a",
};

export const CHART_SERIES_KEYS: ChartSeriesKey[] = ["complete", "overdue", "in_progress"];

/**
 * `/review` status query the chart drill-down navigates with. "In progress"
 * covers open + pending; overdue is shown via the dedicated checkbox there.
 */
export const SERIES_TO_REVIEW_STATUS: Record<ChartSeriesKey, string> = {
  complete: "completed",
  overdue: "open",
  in_progress: "open,pending",
};

/** One chart row: hours bucketed into the three dashboard series. */
export interface ChartDatum {
  name: string;
  complete: number;
  overdue: number;
  in_progress: number;
}

/**
 * Buckets raw fill-rate series into the three dashboard series by fuzzy status
 * name — ported verbatim from `DashboardComponent.shapeChartData`.
 */
export function shapeChartData(response: ChartFillRateResponse): ChartDatum[] {
  const mapSeriesKey = (raw: string): ChartSeriesKey | null => {
    const lower = (raw || "").toLowerCase();
    if (
      lower.includes("complete") ||
      lower.includes("invoiced") ||
      lower.includes("reviewed")
    ) {
      return "complete";
    }
    if (lower.includes("overdue") || lower.includes("cancel")) {
      return "overdue";
    }
    if (
      lower.includes("open") ||
      lower.includes("pending") ||
      lower.includes("progress") ||
      lower.includes("submitted") ||
      lower.includes("plann")
    ) {
      return "in_progress";
    }
    return null;
  };

  return response.data.map((entry) => {
    const buckets: Record<ChartSeriesKey, number> = { complete: 0, overdue: 0, in_progress: 0 };
    for (const item of entry.series) {
      const key = mapSeriesKey(item.name);
      if (!key) continue;
      buckets[key] += item.hours || 0;
    }
    return {
      name: entry.name,
      complete: Math.round(buckets.complete),
      overdue: Math.round(buckets.overdue),
      in_progress: Math.round(buckets.in_progress),
    };
  });
}

// -- Stats (top cards) ------------------------------------------------------

export const dashboardStatsSchema = z.object({
  team_members_count: z.number(),
  clients_count: z.number(),
  complete_reviews_count: z.number(),
  review_pending_count: z.number(),
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// -- Total hours by clients -------------------------------------------------

export type TotalHoursStatus = "overdue" | "in_progress" | "complete";

export const totalHoursEntrySchema = z.object({
  customer_id: z.number(),
  customer_title: z.string(),
  hours: z.number(),
});

export const totalHoursResponseSchema = z.looseObject({
  cycle_title: z.string().catch(""),
  entries: z.array(totalHoursEntrySchema),
});

export type TotalHoursEntry = z.infer<typeof totalHoursEntrySchema>;

// -- Pending reviews by client ----------------------------------------------

export const pendingReviewsEntrySchema = z.object({
  customer_id: z.number(),
  customer_title: z.string(),
  visits_count: z.number(),
});

export const pendingReviewsResponseSchema = z.looseObject({
  cycle_title: z.string().catch(""),
  entries: z.array(pendingReviewsEntrySchema),
});

export type PendingReviewsEntry = z.infer<typeof pendingReviewsEntrySchema>;

// -- Plan documents ---------------------------------------------------------

export const planDocumentSchema = z.looseObject({
  id: z.number(),
  title: z.string(),
  file_type: z.string().catch(""),
  size_bytes: z.number().catch(0),
  download_url: z.string().catch(""),
});

export const planDocumentsResponseSchema = z.object({
  results: z.array(planDocumentSchema),
});

export type PlanDocument = z.infer<typeof planDocumentSchema>;

/** Plans list entry — only what the documents fallback needs. */
export const listablePlanSchema = z.looseObject({
  id: z.number(),
  num_documents: z.number().catch(0),
});

/** Plan detail — carries the attached documents. */
export const detailedPlanSchema = z.looseObject({
  id: z.number(),
  documents: z
    .array(
      z.looseObject({
        id: z.number(),
        title: z.string().catch(""),
        file_name: z.string().catch(""),
        file_type: z.string().catch(""),
        location: z.string().catch(""),
      }),
    )
    .catch([]),
});

/** Preview cap for the dashboard "Plan documents" card. */
export const PLAN_DOCUMENTS_PREVIEW_LIMIT = 5;

/** One row per document title (plans may share the same attachment name). */
export function dedupePlanDocumentsByTitle(documents: PlanDocument[]): PlanDocument[] {
  const seen = new Set<string>();
  const unique: PlanDocument[] = [];
  for (const doc of documents) {
    const key = (doc.title || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(doc);
  }
  return unique.sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );
}

/**
 * Random sample of up to `count` documents (partial Fisher–Yates), re-sorted
 * by title so the card preview stays tidy while still rotating its contents.
 */
export function samplePlanDocuments(documents: PlanDocument[], count: number): PlanDocument[] {
  if (documents.length <= count) return [...documents];
  const pool = [...documents];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool
    .slice(0, count)
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
}

export function formatPlanDocumentSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// -- Reviewable jobs (pending-reviews fallback aggregation, calendar) -------

export const reviewableJobSchema = z.looseObject({
  id: z.number(),
  status: z.string(),
  customer: z.looseObject({ id: z.number(), title: z.string().catch("") }).nullish(),
  visit: z
    .looseObject({
      opens_at: z.string().nullish(),
      closes_at: z.string().nullish(),
    })
    .nullish(),
  completed_on: z.string().nullish(),
});

export type ReviewableJob = z.infer<typeof reviewableJobSchema>;

// -- Customer dashboard: monthly chart --------------------------------------

/** One month bucket of complete hours ("Complete hours by month" chart). */
export interface MonthlyHoursDatum {
  name: string;
  value: number;
}

export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function emptyMonths(): MonthlyHoursDatum[] {
  return MONTH_LABELS.map((name) => ({ name, value: 0 }));
}

/**
 * Collapses the fill-rate response (grouped by month) into 12 buckets of
 * complete hours — ported from `DashboardCustomerComponent.shapeMonthlyChart`.
 * Unknown shapes safely yield zeros.
 */
export function shapeMonthlyChart(response: ChartFillRateResponse): MonthlyHoursDatum[] {
  const months = emptyMonths();

  const monthIndex = (raw: string): number => {
    const lower = (raw || "").toLowerCase();
    const idx = months.findIndex((m) => lower.startsWith(m.name.toLowerCase()));
    if (idx >= 0) return idx;
    const match = /^\d{4}-(\d{2})/.exec(raw || "");
    if (match) return Number(match[1]) - 1;
    return -1;
  };

  for (const entry of response.data) {
    const idx = monthIndex(entry.name);
    if (idx < 0) continue;
    const total = entry.series.reduce((sum, s) => sum + (s.hours || 0), 0);
    months[idx] = { name: months[idx]!.name, value: Math.round(total) };
  }
  return months;
}

/**
 * Collapses the fill-rate response (grouped by client) into a complete-hours
 * total per client, sorted high to low.
 */
export function shapeHoursByClient(response: ChartFillRateResponse): MonthlyHoursDatum[] {
  return response.data
    .map((entry) => ({
      name: entry.name,
      value: Math.round(entry.series.reduce((sum, s) => sum + (s.hours || 0), 0)),
    }))
    .sort((a, b) => b.value - a.value);
}

// -- Customer dashboard: calendar + reminders -------------------------------

export const calendarDayEntrySchema = z.looseObject({
  date: z.string(),
  complete_reviews: z.number().catch(0),
  reviews_pending: z.number().catch(0),
});

export const calendarResponseSchema = z.looseObject({
  days: z.array(calendarDayEntrySchema).catch([]),
});

export const reminderSchema = z.looseObject({
  id: z.number(),
  customer: z.number(),
  /** Brand title, included so the notification bell can label reminders. */
  customer_title: z.string().nullish(),
  date: z.string(),
  text: z.string(),
  created_at: z.string().catch(""),
});

export const remindersResponseSchema = z.object({
  results: z.array(reminderSchema),
});

export type DashboardReminder = z.infer<typeof reminderSchema>;

/** Per-day review counts for the calendar dots and side panel. */
export interface DaySummary {
  completeReviews: number;
  reviewsPending: number;
}

/** Map keyed by YYYY-MM-DD. */
export type DaySummaries = Record<string, DaySummary>;
