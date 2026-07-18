"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/shared/services/api";
import {
  deleteJobAnswer,
  deleteJobPhoto,
  deleteJobReport,
  fetchAllReps,
  fetchJob,
  fetchJobs,
  fetchJobStatusCodes,
  patchJobReport,
  patchJobStatus,
  patchQuestionResponse,
  patchReviewableJobStatus,
  patchStoreGeolocation,
  postJobPhoto,
  postJobPhotosVisit,
  postJobQuestion,
  postJobReport,
  postJobReview,
  setPhotoResponseFeedback,
  setPhotoResponseStatus,
  type JobReportPayload,
  type JobsQuery,
  type JobsView,
} from "./api";
import {
  detailedJobSchema,
  formatJobStatus,
  jobReportSchema,
  type DetailedJob,
  type JobPhotoResponse,
  type JobQuestionResponse,
  type JobStatus,
  type ListableJob,
} from "./schemas";
import type { ResultsPage } from "@/shared/services/api/pagination";

export const jobKeys = {
  all: ["jobs"] as const,
  lists: () => [...jobKeys.all, "list"] as const,
  list: (query: JobsQuery) => [...jobKeys.lists(), query] as const,
  detail: (id: number | null, view?: JobsView) =>
    view && view !== "default"
      ? ([...jobKeys.all, "detail", id, view] as const)
      : ([...jobKeys.all, "detail", id] as const),
  statusCodes: (options: { cancelCode?: boolean; unelevated?: boolean }) =>
    [...jobKeys.all, "status-codes", options] as const,
  reps: () => [...jobKeys.all, "reps"] as const,
};

/** Paginated jobs list; previous page stays visible while refining filters. */
export function useJobsPage(query: JobsQuery, enabled = true) {
  return useQuery({
    queryKey: jobKeys.list(query),
    queryFn: ({ signal }) => fetchJobs(query, signal),
    placeholderData: keepPreviousData,
    // Operational data: always refetch on mount/focus.
    staleTime: 0,
    enabled,
  });
}

export function useJobDetail(id: number | null, view?: JobsView) {
  return useQuery({
    queryKey: jobKeys.detail(id, view),
    queryFn: ({ signal }) => fetchJob(id!, signal, view),
    staleTime: 0,
    enabled: id !== null,
  });
}

/**
 * Submits a visit report. On success the cached detail is updated in place
 * (status → pending, reports ← [response]) exactly like the Angular bloc's
 * optimistic jobStream update, then list + detail are refetched.
 */
export function useSubmitReport(jobId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: JobReportPayload) => postJobReport(jobId!, payload),
    onSuccess: (response) => {
      toast.success("Successfully submitted report");
      for (const view of DETAIL_VIEWS) {
        queryClient.setQueryData<DetailedJob>(jobKeys.detail(jobId, view), (job) => {
          if (!job) return job;
          const report = detailedJobSchema.shape.reports.safeParse([response]);
          return {
            ...job,
            status: "pending",
            reports: report.success ? report.data : job.reports,
          };
        });
      }
      void queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : "Unknown error";
      toast.error(`Failed to submit report: ${message}`);
    },
  });
}

/** Patch an existing job report (Review sidebar Edit Report). */
export function usePatchJobReport(jobId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reportId,
      payload,
    }: {
      reportId: number;
      payload: Pick<JobReportPayload, "actual_minutes" | "completed_on">;
    }) => patchJobReport(reportId, payload),
    onSuccess: (response, vars) => {
      toast.success("Successfully updated report");
      const parsed = jobReportSchema.safeParse(response);
      for (const view of DETAIL_VIEWS) {
        queryClient.setQueryData<DetailedJob>(jobKeys.detail(jobId, view), (job) => {
          if (!job) return job;
          return {
            ...job,
            reports: job.reports.map((report) =>
              report.id === vars.reportId
                ? parsed.success
                  ? parsed.data
                  : {
                      ...report,
                      actual_minutes: vars.payload.actual_minutes,
                      completed_on: vars.payload.completed_on,
                    }
                : report,
            ),
          };
        });
      }
      void queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
    },
    onError: () => toast.error("Failed to update report"),
  });
}

/** Delete a job report (Review sidebar Delete report). */
export function useDeleteJobReport(jobId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: number) => deleteJobReport(reportId),
    onSuccess: (_void, reportId) => {
      toast.success("Successfully deleted report");
      for (const view of DETAIL_VIEWS) {
        queryClient.setQueryData<DetailedJob>(jobKeys.detail(jobId, view), (job) => {
          if (!job) return job;
          return {
            ...job,
            reports: job.reports.filter((report) => report.id !== reportId),
          };
        });
      }
      void queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
    },
    onError: () => toast.error("Failed to delete report"),
  });
}

/** Saves the browser position onto the visit's store (Save geolocation). */
export function useSaveGeolocation() {
  const mutation = useMutation({
    mutationFn: (args: { storeId: number; latitude: number; longitude: number }) =>
      patchStoreGeolocation(args.storeId, args.latitude, args.longitude),
    onSuccess: () => toast.success("Saved Successfully!"),
    onError: () => toast.error("Error saving geolocation"),
  });

  const save = (storeId: number) => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not available in this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        mutation.mutate({
          storeId,
          latitude: +position.coords.latitude.toFixed(6),
          longitude: +position.coords.longitude.toFixed(6),
        });
      },
      () => toast.error("Could not read your current location"),
    );
  };

  return { save, isPending: mutation.isPending };
}

// -- Photo / question response mutations ------------------------------------
//
// The Angular components write the endpoint's returned response list straight
// onto the request (`photoRequest.job_responses = jobResponses`); here the
// same write happens against the cached detail via `setQueryData`.

const DETAIL_VIEWS = [undefined, "reviewable", "archived"] as const;

function useUpdateCachedResponses(jobId: number) {
  const queryClient = useQueryClient();
  return {
    setPhotoResponses: (photoRequestId: number, responses: JobPhotoResponse[]) => {
      for (const view of DETAIL_VIEWS) {
        queryClient.setQueryData<DetailedJob>(jobKeys.detail(jobId, view), (job) =>
          job
            ? {
                ...job,
                photo_requests: job.photo_requests.map((request) =>
                  request.id === photoRequestId
                    ? { ...request, job_responses: responses }
                    : request,
                ),
              }
            : job,
        );
      }
    },
    setQuestionResponses: (questionRequestId: number, responses: JobQuestionResponse[]) => {
      for (const view of DETAIL_VIEWS) {
        queryClient.setQueryData<DetailedJob>(jobKeys.detail(jobId, view), (job) =>
          job
            ? {
                ...job,
                question_requests: job.question_requests.map((request) =>
                  request.id === questionRequestId
                    ? { ...request, job_responses: responses }
                    : request,
                ),
              }
            : job,
        );
      }
    },
    // Prefix match: invalidates both the default and reviewable detail entries.
    refetchDetail: () => queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) }),
  };
}

/**
 * Photo upload for a request. Mirrors the mobile-app logic ported to the web:
 * multiple files go through the batch `photosVisit` endpoint (falling back to
 * per-photo uploads when the backend lacks it), a single file through the
 * per-photo endpoint. `uploadedBy` attributes uploads to the first assignee
 * when the acting user is not assigned to the visit.
 */
export function useUploadJobPhotos(jobId: number) {
  const cache = useUpdateCachedResponses(jobId);
  return useMutation({
    mutationFn: async (args: {
      photoRequestId: number;
      files: File[];
      uploadedBy?: number;
    }) => {
      if (args.files.length > 1) {
        try {
          const result = await postJobPhotosVisit(jobId, args);
          if (result.uploaded.length > 0) {
            toast.success(`Successfully uploaded ${result.uploaded.length} photo(s)`);
          }
          if (result.skipped.length > 0) {
            toast.error("Maximum number of photos uploaded");
          }
          // The batch response has no photo responses — refetch the visit.
          await cache.refetchDetail();
          return;
        } catch (error) {
          // Backends without the batch endpoint: fall back to per-photo uploads.
          if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 405)) {
            throw error;
          }
        }
      }
      for (const file of args.files) {
        const responses = await postJobPhoto(jobId, {
          photoRequestId: args.photoRequestId,
          file,
          uploadedBy: args.uploadedBy,
        });
        cache.setPhotoResponses(args.photoRequestId, responses);
      }
      if (args.files.length === 1) toast.success("Successfully uploaded photo");
    },
    onError: () => toast.error("Failed to upload photos"),
  });
}

export function useDeleteJobPhoto(jobId: number) {
  const cache = useUpdateCachedResponses(jobId);
  return useMutation({
    mutationFn: async (args: { photoRequestId: number; photoResponseId: number }) => {
      const responses = await deleteJobPhoto(jobId, args.photoResponseId);
      cache.setPhotoResponses(args.photoRequestId, responses);
    },
    onSuccess: () => toast.success("Successfully deleted photo"),
    onError: () => toast.error("Failed to delete photo"),
  });
}

export function useAnswerJobQuestion(jobId: number) {
  const cache = useUpdateCachedResponses(jobId);
  return useMutation({
    mutationFn: async (args: {
      questionRequestId: number;
      answerData: unknown;
      answeredBy?: number;
    }) => {
      const responses = await postJobQuestion(jobId, {
        questionRequestId: args.questionRequestId,
        answerData: args.answerData,
        answeredBy: args.answeredBy,
      });
      cache.setQuestionResponses(args.questionRequestId, responses);
    },
    onSuccess: () => toast.success("Successfully answered question"),
    onError: () => toast.error("Failed to answer question"),
  });
}

export function useEditJobAnswer(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { questionResponseId: number; answerData: unknown }) => {
      const patched = await patchQuestionResponse(args.questionResponseId, args.answerData);
      // Prefer server answer_data; fall back to the payload we just sent.
      const answerData = patched.answer_data ?? args.answerData;
      for (const view of DETAIL_VIEWS) {
        queryClient.setQueryData<DetailedJob>(jobKeys.detail(jobId, view), (job) =>
          job
            ? {
                ...job,
                question_requests: job.question_requests.map((request) => ({
                  ...request,
                  job_responses: request.job_responses.map((response) =>
                    response.id === args.questionResponseId
                      ? { ...response, answer_data: answerData }
                      : response,
                  ),
                })),
              }
            : job,
        );
      }
    },
    onSuccess: () => toast.success("Successfully edited answer"),
    onError: () => toast.error("Failed to edit answer"),
  });
}

export function useDeleteJobAnswer(jobId: number) {
  const cache = useUpdateCachedResponses(jobId);
  return useMutation({
    mutationFn: async (args: { questionRequestId: number; questionResponseId: number }) => {
      const responses = await deleteJobAnswer(jobId, args.questionResponseId);
      cache.setQuestionResponses(args.questionRequestId, responses);
    },
    onSuccess: () => toast.success("Successfully deleted answer"),
    onError: () => toast.error("Failed to delete answer"),
  });
}

// -- Review mutations -------------------------------------------------------

/**
 * Marks a reviewable visit as WIP (open) or reviewed (completed) and writes
 * the new status into every cached copy of the detail.
 */
export function useMarkReviewableStatus(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: "open" | "completed") => patchReviewableJobStatus(jobId, status),
    onSuccess: (patched, status) => {
      toast.success(
        status === "open"
          ? "Successfully marked visit as WIP."
          : "Successfully marked visit as reviewed.",
      );
      for (const view of DETAIL_VIEWS) {
        queryClient.setQueryData<DetailedJob>(jobKeys.detail(jobId, view), (job) =>
          job ? { ...job, status: patched.status } : job,
        );
      }
      void queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
    },
    onError: (_error, status) => {
      toast.error(
        status === "open"
          ? "Failed to mark visit as WIP."
          : "Failed to mark visit as reviewed.",
      );
    },
  });
}

/**
 * Per-row quick status change from the jobs-table status menu — Angular
 * `jobs-list.onClickRowChangeStatus` (Note 169). Updates the row in every
 * cached list page in place (Angular mutates the row without refetching) and
 * syncs cached detail copies.
 */
export function useChangeJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, status }: { jobId: number; status: JobStatus }) =>
      patchJobStatus(jobId, status),
    onSuccess: (patched, { jobId }) => {
      toast.success(`Status updated to ${formatJobStatus(patched.status)}.`);
      queryClient.setQueriesData<ResultsPage<ListableJob>>(
        { queryKey: jobKeys.lists() },
        (page) =>
          page
            ? {
                ...page,
                results: page.results.map((job) =>
                  job.id === jobId ? { ...job, status: patched.status } : job,
                ),
              }
            : page,
      );
      for (const view of DETAIL_VIEWS) {
        queryClient.setQueryData<DetailedJob>(jobKeys.detail(jobId, view), (job) =>
          job ? { ...job, status: patched.status } : job,
        );
      }
    },
    onError: () => {
      toast.error("Failed to change status.");
    },
  });
}

function usePatchCachedPhotoResponse(jobId: number, view?: JobsView) {
  const queryClient = useQueryClient();
  return (photoResponseId: number, patch: Partial<JobPhotoResponse>) => {
    queryClient.setQueryData<DetailedJob>(jobKeys.detail(jobId, view), (job) =>
      job
        ? {
            ...job,
            photo_requests: job.photo_requests.map((request) => ({
              ...request,
              job_responses: request.job_responses.map((response) =>
                response.id === photoResponseId ? { ...response, ...patch } : response,
              ),
            })),
          }
        : job,
    );
  };
}

/** Accept / reject (toggle back to pending) a photo during review. */
export function useSetPhotoStatus(jobId: number, view?: JobsView) {
  const patchCached = usePatchCachedPhotoResponse(jobId, view);
  return useMutation({
    mutationFn: (args: {
      photoResponseId: number;
      status: "pending" | "accepted" | "rejected";
    }) => setPhotoResponseStatus(args.photoResponseId, args.status),
    onSuccess: (_result, args) => {
      patchCached(args.photoResponseId, { status: args.status });
      toast.success("Updated photo status");
    },
    onError: () => toast.error("Failed to update photo status"),
  });
}

/** Saves reviewer feedback on a photo response. */
export function useSetPhotoFeedback(jobId: number, view?: JobsView) {
  const patchCached = usePatchCachedPhotoResponse(jobId, view);
  return useMutation({
    mutationFn: (args: { photoResponseId: number; feedback: string }) =>
      setPhotoResponseFeedback(args.photoResponseId, args.feedback),
    onSuccess: (_result, args) => {
      patchCached(args.photoResponseId, { feedback: args.feedback });
      toast.success("Updated photo feedback");
    },
    onError: () => toast.error("Failed to update photo feedback"),
  });
}

/** Visit star rating from the review gallery (`POST jobs/{id}/review/`). */
export function usePostJobReview(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rating: number) => postJobReview(jobId, { rating }),
    onSuccess: () => {
      toast.success("Updated rating!");
      void queryClient.invalidateQueries({ queryKey: jobKeys.detail(jobId) });
    },
    onError: () => toast.error("Failed to update rating"),
  });
}

// -- Reference data for action dialogs --------------------------------------

export function useJobStatusCodes(
  options: { cancelCode?: boolean; unelevated?: boolean },
  enabled: boolean,
) {
  return useQuery({
    queryKey: jobKeys.statusCodes(options),
    queryFn: ({ signal }) => fetchJobStatusCodes(options, signal),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useAllReps(enabled: boolean) {
  return useQuery({
    queryKey: jobKeys.reps(),
    queryFn: ({ signal }) => fetchAllReps(signal),
    staleTime: 5 * 60_000,
    enabled,
  });
}
