import { z } from "zod";

/**
 * Job (visit) models, ported from the Angular `api/v2/models/job/*` and
 * `models/job/job-status.ts`. Schemas are loose: only the fields the frontend
 * reads are validated; the rest of the payload passes through.
 */

// -- Status -----------------------------------------------------------------

export type JobStatus = "planned" | "open" | "pending" | "completed" | "cancelled" | "invoiced";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  planned: "Planning",
  open: "Work in progress",
  pending: "Submitted",
  completed: "Reviewed",
  cancelled: "Cancelled",
  invoiced: "Customer Invoiced",
};

export function formatJobStatus(status: string): string {
  return JOB_STATUS_LABELS[status as JobStatus] ?? status;
}

// -- List entry -------------------------------------------------------------

const bareTitledSchema = z.looseObject({ id: z.number(), title: z.string().catch("") });

export const listableJobSchema = z.looseObject({
  id: z.number(),
  status: z.string(),
  status_code: z.looseObject({ code: z.string().catch("") }).nullish(),
  cycle: bareTitledSchema.nullish(),
  program: bareTitledSchema.nullish(),
  retailer: bareTitledSchema.nullish(),
  customer: bareTitledSchema.nullish(),
  /** Plan group label when the list payload exposes it. */
  group: z.string().nullish(),
  plan: z.looseObject({ group: z.string().nullish() }).nullish(),
  store: z
    .looseObject({
      id: z.number(),
      title: z.string().catch(""),
      store_no: z.union([z.string(), z.number()]).nullish(),
      address1: z.string().nullish(),
    })
    .nullish(),
  visit: z
    .looseObject({
      opens_at: z.string().nullish(),
      closes_at: z.string().nullish(),
      planned_minutes: z.number().catch(0),
    })
    .nullish(),
  assignees: z
    .array(
      z.looseObject({
        id: z.number(),
        username: z.string().nullish(),
        email: z.string().nullish(),
        first_name: z.string().nullish(),
        last_name: z.string().nullish(),
        avatar: z.string().nullish(),
        role: z.string().nullish(),
        phone_number: z.string().nullish(),
        rep_no: z.union([z.string(), z.number()]).nullish(),
      }),
    )
    .catch([]),
  actual_minutes: z.number().nullish(),
  completed_on: z.string().nullish(),
});

export type ListableJob = z.infer<typeof listableJobSchema>;

// -- Detail -----------------------------------------------------------------

const listableUserSchema = z.looseObject({
  id: z.number(),
  username: z.string().nullish(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  email: z.string().nullish(),
  avatar: z.string().nullish(),
  role: z.string().nullish(),
  phone_number: z.string().nullish(),
  rep_no: z.union([z.string(), z.number()]).nullish(),
});

export const photoResponseSchema = z.looseObject({
  id: z.number(),
  status: z.string().catch("pending"),
  feedback: z.string().nullish(),
  photo_location: z.string().catch(""),
});

export const photoRequestSchema = z.looseObject({
  id: z.number(),
  description: z.string().catch(""),
  required: z.boolean().catch(false),
  job_responses: z.array(photoResponseSchema).catch([]),
});

export const questionResponseSchema = z.looseObject({
  id: z.number(),
  answered_at: z.string().nullish(),
  answered_by: listableUserSchema.nullish(),
  answer_data: z.unknown(),
});

export const questionRequestSchema = z.looseObject({
  id: z.number(),
  description: z.string().catch(""),
  required: z.boolean().catch(false),
  kind: z.string().catch(""),
  job_responses: z.array(questionResponseSchema).catch([]),
});

export const jobReportSchema = z.looseObject({
  id: z.number(),
  reported_by_user: listableUserSchema.nullish(),
  actual_minutes: z.number().catch(0),
  completed_on: z.string().nullish(),
});

export const jobDocumentSchema = z.looseObject({
  id: z.number(),
  title: z.string().catch(""),
  file_type: z.string().catch(""),
  location: z.string().catch(""),
});

export const jobReviewSchema = z.looseObject({
  id: z.number(),
  rating: z.number().catch(0),
  content: z.string().catch(""),
  reviewed_at: z.string().nullish(),
  reviewed_by: listableUserSchema.nullish(),
});

export const detailedJobSchema = listableJobSchema.extend({
  documents: z.array(jobDocumentSchema).catch([]),
  photo_requests: z.array(photoRequestSchema).catch([]),
  question_requests: z.array(questionRequestSchema).catch([]),
  reports: z.array(jobReportSchema).catch([]),
  reviews: z.array(jobReviewSchema).catch([]),
  assignments: z
    .array(z.looseObject({ id: z.number(), assignee: listableUserSchema }))
    .catch([]),
  customer: z
    .looseObject({
      id: z.number(),
      title: z.string().catch(""),
      managers: z.array(listableUserSchema).catch([]),
    })
    .nullish(),
});

export type DetailedJob = z.infer<typeof detailedJobSchema>;
export type JobPhotoRequest = z.infer<typeof photoRequestSchema>;
export type JobPhotoResponse = z.infer<typeof photoResponseSchema>;
export type JobQuestionRequest = z.infer<typeof questionRequestSchema>;
export type JobQuestionResponse = z.infer<typeof questionResponseSchema>;
export type JobReport = z.infer<typeof jobReportSchema>;
export type JobReview = z.infer<typeof jobReviewSchema>;

/** Photo response review states (ported from `photo-response-status.model.ts`). */
export const PHOTO_RESPONSE_STATUS_LABELS: Record<string, string> = {
  pending: "Awaiting review",
  accepted: "Accepted",
  rejected: "Action required",
};

/** Question kinds and their answer widgets (`question-request-kind.ts`). */
export type QuestionKind = "text" | "true_false" | "checklist" | "multiple_choice" | "number";

// -- Ordering (API `_order` values, from `v2/filters/job.ts`) ---------------

export type JobOrdering = string;

/** Maps table sort keys to [asc, desc] API ordering values. */
export const JOB_SORT_TO_ORDER: Record<string, [string, string]> = {
  id: ["id", "-id"],
  cycle: ["cycle__title", "-cycle__title"],
  customer: ["program__customer__title", "-program__customer__title"],
  program: ["program__title", "-program__title"],
  retailer: ["store__retailer__title", "-store__retailer__title"],
  store: ["store__store_no", "-store__store_no"],
  opensAt: ["visit__opens_at", "-visit__opens_at"],
  closesAt: ["visit__closes_at", "-visit__closes_at"],
  completedOn: ["reports__completed_on", "-reports__completed_on"],
  plannedMinutes: ["visit__planned_minutes", "-visit__planned_minutes"],
  actualMinutes: ["reports__actual_minutes", "-reports__actual_minutes"],
  status: ["status", "-status"],
  status_code: ["status_code__code", "-status_code__code"],
};

export const STATUS_ORDERINGS = ["status", "-status"];
export const CLOSES_AT_ORDERINGS = ["visit__closes_at", "-visit__closes_at"];
export const OPENS_AT_ORDERINGS = ["visit__opens_at", "-visit__opens_at"];

// -- Utils (ported from `utils/job.ts` / `utils/format-planned-time.ts`) ----

export function isJobOverdue(job: ListableJob): boolean {
  if (job.status === "open" && job.visit?.closes_at) {
    return Date.now() > new Date(job.visit.closes_at).getTime();
  }
  return false;
}

/**
 * Itinerary priority: Overdue (0) → Work in Progress (1) → Submitted (2) →
 * Others (3). PENDING is checked via isJobOverdue-first so submitted jobs are
 * never promoted to "Overdue" just because their window has closed.
 */
function getItineraryJobPriority(job: ListableJob): number {
  if (isJobOverdue(job)) return 0;
  if (job.status === "pending") return 2;
  if (job.status === "open") return 1;
  return 3;
}

/** Priority sort; within each group, by due date ascending (soonest first). */
export function sortJobsForItinerary(jobs: ListableJob[]): ListableJob[] {
  return [...jobs].sort((a, b) => {
    const priorityA = getItineraryJobPriority(a);
    const priorityB = getItineraryJobPriority(b);
    if (priorityA !== priorityB) return priorityA - priorityB;
    const dateA = a.visit?.closes_at ? new Date(a.visit.closes_at).getTime() : 0;
    const dateB = b.visit?.closes_at ? new Date(b.visit.closes_at).getTime() : 0;
    return dateA - dateB;
  });
}

/** Formats minutes as "Xh Ym". */
export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes == null) return "";
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return `${hh}h ${mm}m`;
}

/** UTC date part of an ISO timestamp for visit-date display (amFromUtc parity). */
export function formatUtcDate(value: string | null | undefined): string {
  return value ? new Date(value).toISOString().slice(0, 10) : "—";
}

/** Short visit-date label used in the jobs table (`MMM DD`, Angular parity). */
export function formatUtcDateShort(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
}
