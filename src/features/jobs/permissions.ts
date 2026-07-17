import { isElevated, isElevatedOrManagerOrSupervisor } from "@/features/auth/permissions";
import type { UserRole } from "@/features/auth/types";
import type {
  DetailedJob,
  JobPhotoRequest,
  JobQuestionRequest,
  JobReport,
  JobStatus,
} from "./schemas";

/**
 * Job-scoped requirement / permission helpers ported from `JobDetailBlocBase`
 * and `PermissionsService` as pure functions.
 */

export function isPhotoRequestFilled(request: JobPhotoRequest): boolean {
  return !request.required || request.job_responses.length > 0;
}

export function isQuestionRequestFilled(request: JobQuestionRequest): boolean {
  return !request.required || request.job_responses.length > 0;
}

/** Photo and question requests that still lack required responses. */
export function unfilledJobRequirements(
  job: DetailedJob,
): (JobPhotoRequest | JobQuestionRequest)[] {
  return [
    ...job.photo_requests.filter((r) => !isPhotoRequestFilled(r)),
    ...job.question_requests.filter((r) => !isQuestionRequestFilled(r)),
  ];
}

export function areJobRequirementsFilled(job: DetailedJob): boolean {
  return unfilledJobRequirements(job).length === 0;
}

export function isAssignedToJob(job: DetailedJob, userId: number): boolean {
  return job.assignees.some((assignee) => assignee.id === userId);
}

/** Field work allowed when elevated, or assignee/supervisor on an open/pending job. */
export function canWorkJob(job: DetailedJob, role: UserRole, userId: number): boolean {
  return (
    isElevated(role) ||
    (["open", "pending"].includes(job.status) &&
      (isElevatedOrManagerOrSupervisor(role) || isAssignedToJob(job, userId)))
  );
}

/**
 * Row status-menu visibility — Angular `jobs-list.canShowStatusMenu`
 * (canChangeJobStatus | canMarkJobsAsWIP | canMarkJobsAsReviewed).
 */
export function canShowJobStatusMenu(role: UserRole): boolean {
  return isElevated(role) || isElevatedOrManagerOrSupervisor(role);
}

/**
 * Whether the user may set a visit to the given status — Angular
 * `jobs-list.canChooseStatus`: elevated users pick any status; supervisors
 * flip between WIP (open) / reviewed (completed) only.
 */
export function canChooseJobStatus(
  role: UserRole,
  currentStatus: string,
  status: JobStatus,
): boolean {
  if (currentStatus === status) return false;
  if (isElevated(role)) return true;
  if (status === "open" || status === "completed") {
    return isElevatedOrManagerOrSupervisor(role);
  }
  return false;
}

/** The current user's report for the open job, or null. */
export function myReport(job: DetailedJob, userId: number): JobReport | null {
  return job.reports.find((report) => report.reported_by_user?.id === userId) ?? null;
}

export function canSubmitReport(job: DetailedJob, role: UserRole, userId: number): boolean {
  return canWorkJob(job, role, userId) && areJobRequirementsFilled(job);
}
