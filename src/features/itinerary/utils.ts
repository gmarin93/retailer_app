import { canReportOnBehalf } from "@/features/auth/permissions";
import type { DetailedJob } from "@/features/jobs/schemas";

/**
 * Itinerary-specific helpers ported from `ItineraryDetailBloc` /
 * `ItineraryDetailComponent`. Job-scoped permission/requirement helpers live
 * in `@/features/jobs/permissions` and are re-exported for convenience.
 */
export {
  areJobRequirementsFilled,
  canSubmitReport,
  canWorkJob,
  isAssignedToJob,
  isPhotoRequestFilled,
  isQuestionRequestFilled,
  myReport,
  unfilledJobRequirements,
} from "@/features/jobs/permissions";

export { canReportOnBehalf };

/** Mailto link with the formatted visit subject (ported from `emailToAddresses`). */
export function buildJobMailto(job: DetailedJob, emails: string[]): string {
  const subject =
    `[Club Powerhouse] Regarding visit #${job.id} - ` +
    `${job.customer?.title ?? ""}: ${job.program?.title ?? ""} ` +
    `@ ${job.retailer?.title ?? ""} ${job.store?.store_no ?? ""}: ${job.store?.title ?? ""}`;
  return `mailto:${emails.join(", ")}?subject=${subject}`;
}

/** Account-manager addresses for the visit's customer. */
export function accountManagerEmails(job: DetailedJob): string[] {
  return (job.customer?.managers ?? [])
    .map((manager) => manager.email)
    .filter((email): email is string => !!email);
}

const GEO_TOAST_STORAGE_KEY = "shownGeolocationNotifications";

/**
 * One-time-per-visit gate for the geolocation feature toast, backed by
 * localStorage (ported from `ItineraryDetailComponent`).
 */
export function shouldShowGeolocationToast(visitId: number): boolean {
  try {
    const shown: string[] = JSON.parse(localStorage.getItem(GEO_TOAST_STORAGE_KEY) ?? "[]");
    if (shown.includes(String(visitId))) return false;
    localStorage.setItem(GEO_TOAST_STORAGE_KEY, JSON.stringify([...shown, String(visitId)]));
    return true;
  } catch {
    return false;
  }
}
