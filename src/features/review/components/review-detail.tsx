"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Camera01Icon,
  Clock01Icon,
  HelpCircleIcon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "@/features/auth/hooks";
import {
  canModifyReports,
  isElevatedOrManager,
  isElevatedOrManagerOrSupervisor,
} from "@/features/auth/permissions";
import { UserRole } from "@/features/auth/types";
import { ReportDialog } from "@/features/itinerary/components/report-dialog";
import { buildJobMailto } from "@/features/itinerary/utils";
import { JobDocumentsChips } from "@/features/jobs/components/job-documents-chips";
import { JobPhotosList } from "@/features/jobs/components/job-photos-list";
import { JobQuestionsList } from "@/features/jobs/components/job-questions-list";
import { VisitSectionPanel } from "@/features/jobs/components/visit-section-panel";
import { VisitSummaryCard } from "@/features/jobs/components/visit-summary-card";
import {
  jobKeys,
  useDeleteJobReport,
  useMarkReviewableStatus,
  usePatchJobReport,
  useSubmitReport,
} from "@/features/jobs/hooks";
import { areJobRequirementsFilled, canWorkJob } from "@/features/jobs/permissions";
import {
  formatMinutes,
  formatUtcDate,
  type DetailedJob,
  type JobReport,
} from "@/features/jobs/schemas";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import {
  CancelDialog,
  ExtendDialog,
  IssueEmailUpdateDialog,
  ReassignDialog,
  ReinstateDialog,
  ReturnToItineraryDialog,
} from "./action-dialogs";
import { ReviewGalleryOverlay } from "./review-gallery-overlay";

type ActionDialogKind =
  | "extend"
  | "reassign"
  | "cancel"
  | "reinstate"
  | "return"
  | "email-update";

/** Whether every photo response has been rated (not pending). */
function areAllPhotoResponsesRated(job: DetailedJob): boolean {
  return job.photo_requests.every((request) =>
    request.job_responses.every((response) => response.status !== "pending"),
  );
}

/**
 * Review visit detail — Angular `review-detail-*` layout:
 * toolbar → visit summary card (meta + actions + reports/docs) → Photos | Questions columns.
 */
export function ReviewDetail({
  job,
  onClose,
  onPrevious,
  onNext,
}: {
  job: DetailedJob;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const markStatus = useMarkReviewableStatus(job.id);
  const submitReport = useSubmitReport(job.id);
  const patchReport = usePatchJobReport(job.id);
  const deleteReportMut = useDeleteJobReport(job.id);
  const [openDialog, setOpenDialog] = useState<ActionDialogKind | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryPhotoId, setGalleryPhotoId] = useState<number | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<JobReport | null>(null);
  const [deletingReport, setDeletingReport] = useState<JobReport | null>(null);

  if (!session) return null;
  const role = session.user.role;
  const userId = session.user.id;

  const mayWork = canWorkJob(job, role, userId);
  const supervisorish = isElevatedOrManagerOrSupervisor(role);
  const managerish = isElevatedOrManager(role);
  const isCustomer = role === UserRole.CUSTOMER_ACCOUNT;
  const mayModifyReports = canModifyReports(role);
  const canSubmitReport = mayModifyReports && job.reports.length === 0;

  const statusCode = job.status_code as {
    bypass_mistmatched_actual_time?: boolean;
  } | null;
  const timeMismatch =
    job.actual_minutes != null &&
    job.actual_minutes !== (job.visit?.planned_minutes ?? 0);
  const disableMarkReviewed =
    !["open", "pending"].includes(job.status) ||
    !areJobRequirementsFilled(job) ||
    !areAllPhotoResponsesRated(job) ||
    (timeMismatch && !statusCode?.bypass_mistmatched_actual_time);

  const emails = isCustomer
    ? (job.customer?.managers ?? []).map((m) => m.email).filter((e): e is string => !!e)
    : job.assignees.map((a) => a.email).filter((e): e is string => !!e);

  const refetchDetail = () => {
    void queryClient.invalidateQueries({ queryKey: jobKeys.detail(job.id) });
    void queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
  };

  const cancelReason = (job as { cancel_reason?: string | null }).cancel_reason;

  return (
    <div className="mx-auto max-w-[1200px] space-y-3 sm:space-y-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" className="size-4" />
          Back
        </Button>
        <div className="min-w-0 flex-1" />
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous visit"
            onClick={onPrevious}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" className="size-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Next visit" onClick={onNext}>
            <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>

      <VisitSummaryCard
        job={job}
        storeFormat="review"
        showAssignees
        actions={
          <>
            {supervisorish && job.status === "pending" && (
              <Button
                size="sm"
                disabled={markStatus.isPending}
                onClick={() => markStatus.mutate("open")}
              >
                Mark as WIP
              </Button>
            )}
            {supervisorish && (
              <Button
                size="sm"
                disabled={disableMarkReviewed || markStatus.isPending}
                onClick={() => markStatus.mutate("completed")}
              >
                Mark as reviewed
              </Button>
            )}
            {managerish && (
              <>
                <Button
                  size="sm"
                  disabled={!mayWork}
                  onClick={() => setOpenDialog("extend")}
                >
                  Edit Visit
                </Button>
                <Button
                  size="sm"
                  disabled={!mayWork}
                  onClick={() => setOpenDialog("reassign")}
                >
                  Reassign
                </Button>
                {job.status === "cancelled" ? (
                  <Button size="sm" onClick={() => setOpenDialog("reinstate")}>
                    Reinstate
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={!mayWork}
                    onClick={() => setOpenDialog("cancel")}
                  >
                    Cancel visit
                  </Button>
                )}
              </>
            )}
            {supervisorish && (
              <>
                <Button size="sm" onClick={() => setOpenDialog("return")}>
                  Return Visit
                </Button>
                <Button size="sm" onClick={() => setOpenDialog("email-update")}>
                  Issue email update
                </Button>
              </>
            )}
            {emails.length > 0 && (
              <Button
                size="sm"
                onClick={() => window.open(buildJobMailto(job, emails), "_self")}
              >
                <HugeiconsIcon icon={Mail01Icon} aria-hidden="true" className="size-4" />
                Email
              </Button>
            )}
            {canSubmitReport && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingReport(null);
                  setReportDialogOpen(true);
                }}
              >
                <HugeiconsIcon icon={Clock01Icon} aria-hidden="true" className="size-4" />
                Submit report
              </Button>
            )}
          </>
        }
      >
        {job.reports.length > 0 && (
          <div className="space-y-3 border-t border-border pt-4">
            {job.reports.map((report) => (
              <div key={report.id} className="space-y-2 text-sm">
                <p>
                  <span className="font-bold">Report:</span>{" "}
                  Reported by:{" "}
                  {[report.reported_by_user?.first_name, report.reported_by_user?.last_name]
                    .filter(Boolean)
                    .join(" ") || "—"}
                  <span className="mx-2">Reported on: {formatUtcDate(report.completed_on)}</span>
                  <span>Reported time: {formatMinutes(report.actual_minutes)}</span>
                  {report.actual_minutes !== (job.visit?.planned_minutes ?? 0) && (
                    <span className="ml-1 text-xs text-amber-600">
                      (planned {formatMinutes(job.visit?.planned_minutes)})
                    </span>
                  )}
                </p>
                {mayModifyReports && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingReport(report);
                        setReportDialogOpen(true);
                      }}
                    >
                      Edit Report
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeletingReport(report)}
                    >
                      Delete report
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {job.status === "cancelled" && cancelReason && managerish && (
          <div className="border-t border-border pt-4 text-sm">
            <span className="font-bold">Cancel Reason:</span> {cancelReason}
          </div>
        )}

        {job.documents.length > 0 && (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-sm font-bold">Documents</p>
            <JobDocumentsChips job={job} />
          </div>
        )}
      </VisitSummaryCard>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <VisitSectionPanel title="Photos" icon={Camera01Icon}>
          <JobPhotosList
            job={job}
            reviewMode
            view="reviewable"
            showCardBadge
            onPhotoClick={(response) => {
              setGalleryPhotoId(response.id);
              setGalleryOpen(true);
            }}
          />
        </VisitSectionPanel>
        <VisitSectionPanel title="Questions" icon={HelpCircleIcon}>
          <JobQuestionsList job={job} showCardBadge />
        </VisitSectionPanel>
      </div>

      <ExtendDialog
        jobId={job.id}
        open={openDialog === "extend"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        onDone={refetchDetail}
      />
      <ReassignDialog
        jobId={job.id}
        open={openDialog === "reassign"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        onDone={refetchDetail}
      />
      <CancelDialog
        jobId={job.id}
        open={openDialog === "cancel"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        onDone={refetchDetail}
      />
      <ReinstateDialog
        jobId={job.id}
        open={openDialog === "reinstate"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        onDone={refetchDetail}
      />
      <ReturnToItineraryDialog
        jobId={job.id}
        open={openDialog === "return"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        onDone={refetchDetail}
      />
      <IssueEmailUpdateDialog
        jobId={job.id}
        open={openDialog === "email-update"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        onDone={refetchDetail}
      />

      {galleryOpen && (
        <ReviewGalleryOverlay
          key={`${job.id}-${galleryPhotoId ?? "none"}`}
          job={job}
          open={galleryOpen}
          initialPhotoResponseId={galleryPhotoId}
          onOpenChange={setGalleryOpen}
          onEmail={() => {
            if (emails.length > 0) {
              window.open(buildJobMailto(job, emails), "_self");
            }
          }}
        />
      )}

      <ReportDialog
        key={editingReport ? `edit-${editingReport.id}` : "submit"}
        job={job}
        open={reportDialogOpen}
        onOpenChange={(open) => {
          setReportDialogOpen(open);
          if (!open) setEditingReport(null);
        }}
        editReport={editingReport}
        isPending={submitReport.isPending || patchReport.isPending}
        onSubmit={(payload) => {
          if (editingReport) {
            patchReport.mutate(
              {
                reportId: editingReport.id,
                payload: {
                  actual_minutes: payload.actual_minutes,
                  completed_on: payload.completed_on,
                },
              },
              {
                onSuccess: () => {
                  setReportDialogOpen(false);
                  setEditingReport(null);
                },
              },
            );
            return;
          }
          submitReport.mutate(payload, {
            onSuccess: () => setReportDialogOpen(false),
          });
        }}
      />

      <ConfirmDialog
        open={deletingReport !== null}
        onOpenChange={(open) => !open && setDeletingReport(null)}
        title="Delete report"
        question="Are you sure you want to delete this report?"
        destructive
        onConfirm={() => {
          if (!deletingReport) return;
          deleteReportMut.mutate(deletingReport.id, {
            onSuccess: () => setDeletingReport(null),
          });
        }}
      />
    </div>
  );
}
