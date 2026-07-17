"use client";

import { ArrowLeft01Icon, ArrowRight01Icon, Mail01Icon } from "@hugeicons/core-free-icons";
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
import { JobPhotosList } from "@/features/jobs/components/job-photos-list";
import { JobQuestionsList } from "@/features/jobs/components/job-questions-list";
import { JobStatusChip } from "@/features/jobs/components/job-status-chip";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
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
  "extend" | "reassign" | "cancel" | "reinstate" | "return" | "email-update";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/** Whether every photo response has been rated (not pending). */
function areAllPhotoResponsesRated(job: DetailedJob): boolean {
  return job.photo_requests.every((request) =>
    request.job_responses.every((response) => response.status !== "pending"),
  );
}

/**
 * Review visit detail: status actions in the header, photos + questions
 * columns, and the info/reports sidebar — ported from the `review-detail-*`
 * component family and `ReviewDetailBloc`.
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

  /**
   * Mark-as-reviewed gate ported from `disableMarkJobAsReviewed`: open/pending
   * only, requirements filled, all photos rated, and no planned/actual time
   * mismatch unless the status code bypasses it.
   */
  const statusCode = job.status_code as { bypass_mistmatched_actual_time?: boolean } | null;
  const timeMismatch =
    job.actual_minutes != null && job.actual_minutes !== (job.visit?.planned_minutes ?? 0);
  const disableMarkReviewed =
    !["open", "pending"].includes(job.status) ||
    !areJobRequirementsFilled(job) ||
    !areAllPhotoResponsesRated(job) ||
    (timeMismatch && !statusCode?.bypass_mistmatched_actual_time);

  /** Email: customers write to account managers, others to assignees. */
  const emails = isCustomer
    ? (job.customer?.managers ?? []).map((m) => m.email).filter((e): e is string => !!e)
    : job.assignees.map((a) => a.email).filter((e): e is string => !!e);

  const refetchDetail = () => {
    void queryClient.invalidateQueries({ queryKey: jobKeys.detail(job.id) });
    void queryClient.invalidateQueries({ queryKey: jobKeys.lists() });
  };

  const assigneeNames =
    job.assignments.length > 0
      ? job.assignments
          .map((a) => [a.assignee.first_name, a.assignee.last_name].filter(Boolean).join(" "))
          .join(", ")
      : "—";

  const cancelReason = (job as { cancel_reason?: string | null }).cancel_reason;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" className="size-4" />
          Back
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">
            Visit #{job.id} — {job.customer?.title}
          </h1>
        </div>
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

      <div className="flex flex-wrap items-center gap-2">
        <JobStatusChip job={job} />
        <div className="flex-1" />
        {supervisorish && job.status === "pending" && (
          <Button
            variant="outline"
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
              variant="outline"
              size="sm"
              disabled={!mayWork}
              onClick={() => setOpenDialog("extend")}
            >
              Change visit
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!mayWork}
              onClick={() => setOpenDialog("reassign")}
            >
              Reassign
            </Button>
            {job.status === "cancelled" ? (
              <Button variant="outline" size="sm" onClick={() => setOpenDialog("reinstate")}>
                Reinstate
              </Button>
            ) : (
              <Button
                variant="outline"
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
            <Button variant="outline" size="sm" onClick={() => setOpenDialog("return")}>
              Return to itinerary
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOpenDialog("email-update")}>
              Email update
            </Button>
          </>
        )}
        {emails.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(buildJobMailto(job, emails), "_self")}
          >
            <HugeiconsIcon icon={Mail01Icon} aria-hidden="true" className="size-4" />
            Email
          </Button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <JobPhotosList
                job={job}
                reviewMode
                view="reviewable"
                onPhotoClick={(response) => {
                  setGalleryPhotoId(response.id);
                  setGalleryOpen(true);
                }}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <JobQuestionsList job={job} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visit info</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <InfoRow label="Cycle" value={job.cycle?.title ?? "—"} />
              <InfoRow label="Program" value={job.program?.title ?? "—"} />
              <InfoRow
                label="Store"
                value={`${job.retailer?.title ?? ""} #${job.store?.store_no ?? ""}: ${job.store?.title ?? ""}`}
              />
              <InfoRow label="Assignees" value={assigneeNames} />
              <InfoRow label="Starts on" value={formatUtcDate(job.visit?.opens_at)} />
              <InfoRow label="Due on" value={formatUtcDate(job.visit?.closes_at)} />
              <InfoRow label="Planned time" value={formatMinutes(job.visit?.planned_minutes)} />
              {job.status_code?.code && (
                <InfoRow label="Status code" value={job.status_code.code} />
              )}
              {job.status === "cancelled" && cancelReason && managerish && (
                <InfoRow label="Cancel reason" value={cancelReason} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Reports</CardTitle>
              {canSubmitReport && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingReport(null);
                    setReportDialogOpen(true);
                  }}
                >
                  Submit report
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {job.reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No report submitted yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {job.reports.map((report) => (
                    <li key={report.id} className="space-y-2 rounded-md border p-2">
                      <p className="font-medium">
                        {formatMinutes(report.actual_minutes)}
                        {report.actual_minutes !== (job.visit?.planned_minutes ?? 0) && (
                          <span className="ml-1 text-xs text-amber-600">
                            (planned {formatMinutes(job.visit?.planned_minutes)})
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground">
                        Completed {formatUtcDate(report.completed_on)}
                        {report.reported_by_user
                          ? ` by ${[report.reported_by_user.first_name, report.reported_by_user.last_name].filter(Boolean).join(" ")}`
                          : ""}
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
                            Edit report
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
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {job.documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {job.documents.map((doc) => (
                    <li key={doc.id}>
                      {doc.location ? (
                        <a
                          href={doc.location}
                          target="_blank"
                          rel="noreferrer"
                          className="underline-offset-2 hover:underline"
                        >
                          {doc.title}
                        </a>
                      ) : (
                        doc.title
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
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
