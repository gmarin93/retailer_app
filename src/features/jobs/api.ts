import { z } from "zod";
import { env } from "@/shared/lib/env";
import { api, apiPostForm, httpClient } from "@/shared/services/api";
import {
  FETCH_ALL_PAGE_SIZE,
  fetchAllPages,
  resultsPageSchema,
  type ResultsPage,
} from "@/shared/services/api/pagination";
import {
  detailedJobSchema,
  listableJobSchema,
  photoResponseSchema,
  questionResponseSchema,
  type DetailedJob,
  type ListableJob,
} from "./schemas";

type PhotoResponse = z.infer<typeof photoResponseSchema>;
type QuestionResponse = z.infer<typeof questionResponseSchema>;

const v2 = `${env.apiHost}/v2`;

const jobPageSchema = resultsPageSchema(listableJobSchema);

/**
 * Jobs list query, mirroring the Angular `JobFilter.prepare()` params:
 * `_page` (1-based), `_page_size`, `_search`, `_order`, plus DRF field filters.
 */
export type JobsView = "default" | "reviewable" | "archived";

export interface JobsQuery {
  /** Which list endpoint to hit: `jobs/` or `jobs/reviewable/`. */
  view?: JobsView;
  /** 0-based page index (sent as `_page = page + 1`, matching Angular). */
  page: number;
  pageSize: number;
  search?: string;
  /** API ordering values, joined into `_order`. */
  order: string[];
  /** Explicit job ids (deep links). */
  ids?: number[];
  statuses?: string[];
  assignees?: number[];
  customers?: number[];
  programs?: number[];
  cycles?: number[];
  provinces?: string[];
  retailers?: number[];
  stores?: number[];
  storeRegions?: number[];
  /**
   * Open visits whose close date is before today (local YYYY-MM-DD).
   * Forces `status__in=open` + `visit__closes_at__lt` (Angular `JobFilter.overdue`).
   */
  overdue?: boolean;
  /** Visits with no assignees (`assignments__isnull=True`). */
  unassigned?: boolean;
  /** `status_code__isnull=True`. */
  noStatusCode?: boolean;
  statusCodes?: string[];
  /** Exact visit open/close dates (`visit__opens_at` / `visit__closes_at`). */
  opensOn?: string;
  closesOn?: string;
  /** Inclusive period bounds (`visit__opens_at__gte` / `visit__closes_at__lte`). */
  periodStart?: string;
  periodEnd?: string;
  /** Plan groups joined as `plan__group__iregex`. */
  groups?: string[];
  /** Incremental sync cursor (ISO datetime) for operations detail. */
  updatedSince?: string;
}

/** Local calendar date as YYYY-MM-DD (Angular moment().format("YYYY-MM-DD")). */
function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function jobsRoute(view?: JobsView): string {
  if (view === "reviewable") return `${v2}/jobs/reviewable`;
  if (view === "archived") return `${v2}/jobs/archived`;
  return `${v2}/jobs`;
}

export async function fetchJobs(
  query: JobsQuery,
  signal?: AbortSignal,
): Promise<ResultsPage<ListableJob>> {
  const statuses = query.overdue ? ["open"] : query.statuses;
  const data = await api.get<unknown>(`${jobsRoute(query.view)}/`, {
    searchParams: {
      _page: query.page + 1,
      _page_size: query.pageSize,
      _search: query.search?.trim() || undefined,
      _order: query.order.length > 0 ? query.order.join(",") : undefined,
      id__in: query.ids?.length ? query.ids.join(",") : undefined,
      status__in: statuses?.length ? statuses.join(",") : undefined,
      assignments__assignee__id__in:
        !query.unassigned && query.assignees?.length
          ? query.assignees.join(",")
          : undefined,
      program__customer__id__in: query.customers?.length
        ? query.customers.join(",")
        : undefined,
      program__retailer__id__in: query.retailers?.length
        ? query.retailers.join(",")
        : undefined,
      program__id__in: query.programs?.length ? query.programs.join(",") : undefined,
      cycle__id__in: query.cycles?.length ? query.cycles.join(",") : undefined,
      store__id__in: query.stores?.length ? query.stores.join(",") : undefined,
      store__regions__in: query.storeRegions?.length
        ? query.storeRegions.join(",")
        : undefined,
      store__province__in: query.provinces?.length ? query.provinces.join(",") : undefined,
      visit__opens_at: query.opensOn || undefined,
      visit__closes_at: query.closesOn || undefined,
      visit__opens_at__gte: query.periodStart || undefined,
      visit__closes_at__lte: query.periodEnd || undefined,
      visit__closes_at__lt: query.overdue ? todayLocalISO() : undefined,
      assignments__isnull: query.unassigned ? "True" : undefined,
      status_code__isnull: query.noStatusCode ? "True" : undefined,
      status_code__code__in:
        !query.noStatusCode && query.statusCodes?.length
          ? query.statusCodes.join(",")
          : undefined,
      plan__group__iregex: query.groups?.length ? query.groups.join("|") : undefined,
      updated_since: query.updatedSince || undefined,
    },
    signal,
  });
  return jobPageSchema.parse(data);
}

/** Count of a jobs list without pulling rows (`_page_size=1`). */
export async function fetchJobsCount(
  query: Omit<JobsQuery, "page" | "pageSize" | "order"> & {
    order?: string[];
  },
  signal?: AbortSignal,
): Promise<number> {
  try {
    const page = await fetchJobs(
      {
        ...query,
        page: 0,
        pageSize: 1,
        order: query.order ?? [],
      },
      signal,
    );
    return page.count;
  } catch {
    return 0;
  }
}

/** All pages of a jobs query (operations detail / command-center fallbacks). */
export async function fetchAllJobs(
  query: Omit<JobsQuery, "page" | "pageSize"> & { pageSize?: number },
  signal?: AbortSignal,
): Promise<ListableJob[]> {
  const pageSize = query.pageSize ?? FETCH_ALL_PAGE_SIZE;
  return fetchAllPages(async (page) =>
    fetchJobs(
      {
        ...query,
        page: page - 1,
        pageSize,
      },
      signal,
    ),
  );
}

export async function fetchJob(
  id: number,
  signal?: AbortSignal,
  view?: JobsView,
): Promise<DetailedJob> {
  const data = await api.get<unknown>(`${jobsRoute(view)}/${id}/`, { signal });
  return detailedJobSchema.parse(data);
}

export interface JobReportPayload {
  actual_minutes: number;
  completed_on: string; // YYYY-MM-DD
  /** Present when an elevated user reports on behalf of an assignee. */
  reported_by?: number;
}

/** `POST jobs/{id}/report/` — submits the rep's visit report. */
export async function postJobReport(id: number, payload: JobReportPayload): Promise<unknown> {
  return api.post<unknown>(`${v2}/jobs/${id}/report/`, payload);
}

/** `PATCH /v2/job_reports/{id}/` — update actual minutes + completed date. */
export async function patchJobReport(
  reportId: number,
  payload: Pick<JobReportPayload, "actual_minutes" | "completed_on">,
): Promise<unknown> {
  return api.patch<unknown>(`${v2}/job_reports/${reportId}/`, payload);
}

/** `DELETE /v2/job_reports/{id}/`. */
export async function deleteJobReport(reportId: number): Promise<void> {
  await api.delete(`${v2}/job_reports/${reportId}/`);
}

/** Patches the visit store's recorded position (itinerary geolocation button). */
export async function patchStoreGeolocation(
  storeId: number,
  latitude: number,
  longitude: number,
): Promise<unknown> {
  return api.patch<unknown>(`${v2}/stores/${storeId}/`, { latitude, longitude });
}

// -- Photo responses (ported from `jobPostPhoto` / `jobPostPhotosVisit` / `jobPostXPhoto`) --

const photoResponsesSchema = z.array(photoResponseSchema);

/**
 * `POST jobs/{id}/photo/` — uploads one photo for a photo request. Returns the
 * request's full response list, which the caller writes back into the cache.
 */
export async function postJobPhoto(
  jobId: number,
  args: { photoRequestId: number; file: File; uploadedBy?: number },
): Promise<PhotoResponse[]> {
  const formData = new FormData();
  formData.append("photo_request", String(args.photoRequestId));
  formData.append("file", args.file);
  if (args.uploadedBy != null) formData.append("uploaded_by", String(args.uploadedBy));
  const data = await apiPostForm<unknown>(`${v2}/jobs/${jobId}/photo/`, formData);
  return photoResponsesSchema.parse(data);
}

export const photosVisitResultSchema = z.object({
  uploaded: z.array(z.unknown()).catch([]),
  skipped: z.array(z.unknown()).catch([]),
});

export type PhotosVisitResult = z.infer<typeof photosVisitResultSchema>;

/**
 * `POST jobs/{id}/photosVisit/` — batch upload (same endpoint the mobile app
 * uses for multi-photo submissions). The response carries uploaded/skipped
 * outcomes but not the photo responses, so callers must refetch the job.
 */
export async function postJobPhotosVisit(
  jobId: number,
  args: { photoRequestId: number; files: File[]; uploadedBy?: number },
): Promise<PhotosVisitResult> {
  const formData = new FormData();
  for (const file of args.files) formData.append("files", file);
  formData.append("photo_request_ids", args.files.map(() => args.photoRequestId).join(","));
  if (args.uploadedBy != null) formData.append("uploaded_by", String(args.uploadedBy));
  const data = await apiPostForm<unknown>(`${v2}/jobs/${jobId}/photosVisit/`, formData);
  return photosVisitResultSchema.parse(data);
}

/** `POST jobs/{id}/xphoto/` — deletes a photo response; returns the remaining list. */
export async function deleteJobPhoto(
  jobId: number,
  photoResponseId: number,
): Promise<PhotoResponse[]> {
  const data = await api.post<unknown>(`${v2}/jobs/${jobId}/xphoto/`, {
    photo_response: photoResponseId,
  });
  return photoResponsesSchema.parse(data);
}

// -- Question responses (ported from `jobPostQuestion` / `jobPostXQuestion`) --

const questionResponsesSchema = z.array(questionResponseSchema);

/** `POST jobs/{id}/question/` — answers a question; returns the response list. */
export async function postJobQuestion(
  jobId: number,
  args: { questionRequestId: number; answerData: unknown; answeredBy?: number },
): Promise<QuestionResponse[]> {
  const data = await api.post<unknown>(`${v2}/jobs/${jobId}/question/`, {
    question_request: args.questionRequestId,
    answer_data: args.answerData,
    ...(args.answeredBy != null ? { answered_by: args.answeredBy } : {}),
  });
  return questionResponsesSchema.parse(data);
}

/** `POST jobs/{id}/xquestion/` — deletes an answer; returns the remaining list. */
export async function deleteJobAnswer(
  jobId: number,
  questionResponseId: number,
): Promise<QuestionResponse[]> {
  const data = await api.post<unknown>(`${v2}/jobs/${jobId}/xquestion/`, {
    question_response: questionResponseId,
  });
  return questionResponsesSchema.parse(data);
}

/**
 * `PATCH question_responses/{id}/` — edits an existing answer.
 * Response is the base model (`answered_by` as user ID), not the nested
 * detail shape used inside job payloads — only `answer_data` is required.
 */
const patchedQuestionResponseSchema = z.looseObject({
  answer_data: z.unknown(),
});

export async function patchQuestionResponse(
  responseId: number,
  answerData: unknown,
): Promise<{ answer_data: unknown }> {
  const data = await api.patch<unknown>(`${v2}/question_responses/${responseId}/`, {
    answer_data: answerData,
  });
  return patchedQuestionResponseSchema.parse(data);
}

/**
 * `PATCH jobs/{id}/` — per-row quick status change (Angular jobs-list
 * `onClickRowChangeStatus`, Note 169).
 */
export async function patchJobStatus(id: number, status: string): Promise<ListableJob> {
  const data = await api.patch<unknown>(`${v2}/jobs/${id}/`, { status });
  return listableJobSchema.parse(data);
}

// -- Review actions (ported from `ReviewDetailBloc` + ApiV2Service) ---------

/** `PATCH jobs/reviewable/{id}/` — mark as WIP (open) / reviewed (completed). */
export async function patchReviewableJobStatus(
  id: number,
  status: "open" | "completed",
): Promise<ListableJob> {
  const data = await api.patch<unknown>(`${v2}/jobs/reviewable/${id}/`, { status });
  return listableJobSchema.parse(data);
}

export async function returnJobToItinerary(
  id: number,
  payload: { status_code?: number | null; reason?: string; copy_me?: boolean },
): Promise<unknown> {
  return api.post<unknown>(`${v2}/jobs/reviewable/${id}/return/`, payload);
}

export async function issueJobEmailUpdate(
  id: number,
  payload: { content?: string; copy_me?: boolean },
): Promise<unknown> {
  return api.post<unknown>(`${v2}/jobs/reviewable/${id}/issue_email_update/`, payload);
}

/** Photo review: `photo_responses/{id}/set_status|set_feedback/`. */
export async function setPhotoResponseStatus(
  id: number,
  status: "pending" | "accepted" | "rejected",
): Promise<unknown> {
  return api.post<unknown>(`${v2}/photo_responses/${id}/set_status/`, { status });
}

export async function setPhotoResponseFeedback(id: number, feedback: string): Promise<unknown> {
  return api.post<unknown>(`${v2}/photo_responses/${id}/set_feedback/`, { feedback });
}

/** Visit star rating from the review gallery (`POST jobs/{id}/review/`). */
export async function postJobReview(
  jobId: number,
  payload: { rating: number; content?: string },
): Promise<unknown> {
  return api.post<unknown>(`${v2}/jobs/${jobId}/review/`, payload);
}

// -- Bulk job actions (`POST jobs/{action}/`) -------------------------------

export interface BulkActionResult {
  jobs_changed?: number[];
  jobs_cancelled?: number[];
  jobs_skipped?: number[];
  jobs_errored?: number[];
}

export async function extendJobs(payload: {
  jobs: number[];
  opens_at?: string;
  closes_at?: string;
  planned_minutes?: number;
}): Promise<BulkActionResult> {
  return api.post<BulkActionResult>(`${v2}/jobs/extend/`, payload);
}

export async function reassignJobs(payload: {
  jobs: number[];
  users: number[];
}): Promise<BulkActionResult> {
  return api.post<BulkActionResult>(`${v2}/jobs/reassign/`, payload);
}

export async function cancelJobs(payload: {
  jobs: number[];
  status_code?: number | null;
  cancel_reason?: string;
}): Promise<BulkActionResult> {
  return api.post<BulkActionResult>(`${v2}/jobs/cancel/`, payload);
}

export async function reinstateJobs(payload: { jobs: number[] }): Promise<BulkActionResult> {
  return api.post<BulkActionResult>(`${v2}/jobs/reinstate/`, payload);
}

/** `POST jobs/publish/` — publish planned visits for selected reps in a cycle. */
export async function publishJobs(payload: {
  cycle: number;
  users: number[];
}): Promise<{ num_jobs: number; num_users: number }> {
  return api.post<{ num_jobs: number; num_users: number }>(`${v2}/jobs/publish/`, payload);
}

/** `POST jobs/edit/` — bulk edit visit fields (operations detail). */
export async function editJobs(payload: {
  jobs: number[];
  status?: string;
  status_code?: string | number | null;
  program?: number;
  store?: number;
  cycle?: number;
  opens_at?: string;
  closes_at?: string;
  planned_minutes?: number;
}): Promise<BulkActionResult> {
  return api.post<BulkActionResult>(`${v2}/jobs/edit/`, payload);
}

// -- Reference data for the action dialogs ----------------------------------

export const jobStatusCodeSchema = z.looseObject({
  id: z.number(),
  code: z.string().catch(""),
  description: z.string().catch(""),
});

export type JobStatusCode = z.infer<typeof jobStatusCodeSchema>;

const statusCodePageSchema = resultsPageSchema(jobStatusCodeSchema);

/** Status codes; `cancelCode` / `unelevated` mirror the Angular filter flags. */
export async function fetchJobStatusCodes(
  options: { cancelCode?: boolean; unelevated?: boolean },
  signal?: AbortSignal,
): Promise<JobStatusCode[]> {
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${v2}/job_status_codes/`, {
      searchParams: {
        cancel_code: options.cancelCode ? "True" : undefined,
        elevated: options.unelevated ? "False" : undefined,
        _page: page,
        _page_size: FETCH_ALL_PAGE_SIZE,
      },
      signal,
    });
    return statusCodePageSchema.parse(data);
  });
}

export const repUserSchema = z.looseObject({
  id: z.number(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  rep_no: z.union([z.string(), z.number()]).nullish(),
});

export type RepUser = z.infer<typeof repUserSchema>;

const repPageSchema = resultsPageSchema(repUserSchema);

/** All reps ordered by rep number (reassign dialog). */
export async function fetchAllReps(signal?: AbortSignal): Promise<RepUser[]> {
  return fetchAllPages(async (page) => {
    const data = await api.get<unknown>(`${v2}/users/`, {
      searchParams: {
        rep_no__gte: 0,
        _order: "rep_no",
        _page: page,
        _page_size: FETCH_ALL_PAGE_SIZE,
      },
      signal,
    });
    return repPageSchema.parse(data);
  });
}

// -- Downloads (photos report + emailed server reports) --------------------

const photoReportJobSchema = z.looseObject({
  id: z.number(),
  photo_responses: z
    .array(
      z.looseObject({
        photo_filename: z.string().catch(""),
        photo_location: z.string().catch(""),
      }),
    )
    .catch([]),
});

export type PhotosReportJob = z.infer<typeof photoReportJobSchema>;
const photosReportPageSchema = resultsPageSchema(photoReportJobSchema);

export type JobsReportType =
  | "photos_zip"
  | "legacy_cms"
  | "legacy_website"
  | "fill_rate"
  | "rep_distro"
  | "invoicing_summary"
  | "rep_summary"
  | "rep_details";

function reportRoute(view: JobsView | undefined, path: string): string {
  return `${jobsRoute(view)}/${path}`;
}

/** Paginated photos metadata used to build client-side ZIP downloads. */
export async function fetchPhotosReport(
  query: Omit<JobsQuery, "page" | "pageSize" | "order"> & { order?: string[] },
  signal?: AbortSignal,
): Promise<PhotosReportJob[]> {
  return fetchAllPages(async (page) => {
    const statuses = query.overdue ? ["open"] : query.statuses;
    const data = await api.get<unknown>(`${reportRoute(query.view, "photos_report")}/`, {
      searchParams: {
        _page: page,
        _page_size: FETCH_ALL_PAGE_SIZE,
        _search: query.search?.trim() || undefined,
        id__in: query.ids?.length ? query.ids.join(",") : undefined,
        status__in: statuses?.length ? statuses.join(",") : undefined,
        assignments__assignee__id__in: query.assignees?.length
          ? query.assignees.join(",")
          : undefined,
        program__customer__id__in: query.customers?.length
          ? query.customers.join(",")
          : undefined,
        program__id__in: query.programs?.length ? query.programs.join(",") : undefined,
        cycle__id__in: query.cycles?.length ? query.cycles.join(",") : undefined,
        visit__closes_at__lt: query.overdue ? todayLocalISO() : undefined,
        assignments__isnull: query.unassigned ? "True" : undefined,
      },
      signal,
    });
    return photosReportPageSchema.parse(data);
  });
}

/** Email a server-generated report for the current filter scope. */
export async function emailJobsReport(
  view: JobsView | undefined,
  reportPath: string,
  email: string,
  query: Partial<JobsQuery>,
): Promise<unknown> {
  return api.post<unknown>(`${reportRoute(view, reportPath)}/`, {
    email,
    ...Object.fromEntries(
      Object.entries({
        id__in: query.ids?.join(","),
        status__in: query.statuses?.join(","),
        cycle__id__in: query.cycles?.join(","),
        program__customer__id__in: query.customers?.join(","),
        program__id__in: query.programs?.join(","),
      }).filter(([, v]) => v),
    ),
  });
}

/** Download a blob report (rep summary / details). */
export async function downloadJobsReportBlob(
  view: JobsView | undefined,
  reportPath: string,
  query: Partial<JobsQuery>,
): Promise<Blob> {
  const searchParams: Record<string, string | undefined> = {
    id__in: query.ids?.length ? query.ids.join(",") : undefined,
    status__in: query.statuses?.length ? query.statuses.join(",") : undefined,
    cycle__id__in: query.cycles?.length ? query.cycles.join(",") : undefined,
    program__customer__id__in: query.customers?.length
      ? query.customers.join(",")
      : undefined,
    program__id__in: query.programs?.length ? query.programs.join(",") : undefined,
  };
  return httpClient
    .get(`${reportRoute(view, reportPath)}/`, {
      searchParams: Object.fromEntries(
        Object.entries(searchParams).filter(([, v]) => v != null),
      ),
    })
    .blob();
}
