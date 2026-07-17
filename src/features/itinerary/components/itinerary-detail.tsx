"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  File01Icon,
  Location01Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/features/auth/hooks";
import { useSaveGeolocation, useSubmitReport } from "@/features/jobs/hooks";
import {
  formatJobStatus,
  formatMinutes,
  formatUtcDate,
  type DetailedJob,
} from "@/features/jobs/schemas";
import { JobPhotosList } from "@/features/jobs/components/job-photos-list";
import { JobQuestionsList } from "@/features/jobs/components/job-questions-list";
import { JobStatusChip } from "@/features/jobs/components/job-status-chip";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import {
  accountManagerEmails,
  buildJobMailto,
  canSubmitReport,
  canWorkJob,
  myReport,
  shouldShowGeolocationToast,
  unfilledJobRequirements,
} from "../utils";
import { ReportDialog } from "./report-dialog";

function MetaTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * Itinerary visit detail — header, meta tiles, documents/questions/photos
 * sections, and the report submission flow. Ported from the
 * `itinerary-detail*` component family and `ItineraryDetailBloc`.
 */
export function ItineraryDetail({
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
  const geolocation = useSaveGeolocation();
  const submitReport = useSubmitReport(job.id);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  /** Pending-submission warning appears 5s after opening a submitted visit.
   * Keyed by job id so switching visits resets it without effect-time setState. */
  const [pendingWarningJobId, setPendingWarningJobId] = useState<number | null>(null);
  const showPendingWarning = pendingWarningJobId === job.id;
  useEffect(() => {
    if (job.status !== "pending") return;
    const jobId = job.id;
    const timer = setTimeout(() => setPendingWarningJobId(jobId), 5000);
    return () => clearTimeout(timer);
  }, [job.id, job.status]);

  /** One-time geolocation feature toast for open visits (localStorage-gated). */
  const geoToastShownFor = useRef<number | null>(null);
  useEffect(() => {
    if (job.status !== "open" || geoToastShownFor.current === job.id) return;
    geoToastShownFor.current = job.id;
    if (shouldShowGeolocationToast(job.id)) {
      toast.info("We've added a temporary feature!", {
        description:
          "A geolocation save button is now on this screen for recording your location during each visit.",
      });
    }
  }, [job.id, job.status]);

  if (!session) return null;
  const role = session.user.role;
  const userId = session.user.id;

  const mayWork = canWorkJob(job, role, userId);
  const maySubmit = canSubmitReport(job, role, userId);
  const requirements = unfilledJobRequirements(job);
  const report = myReport(job, userId);
  const managerEmails = accountManagerEmails(job);

  const onEmail = () => {
    window.open(buildJobMailto(job, managerEmails), "_self");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" className="size-4" />
          Back
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">Visit details</h1>
          <p className="text-sm text-muted-foreground">
            Review documents, questions, and photos, then submit the visit.
          </p>
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

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase">Visit #{job.id}</p>
            <CardTitle className="text-lg">{job.customer?.title}</CardTitle>
          </div>
          <JobStatusChip job={job} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onEmail}
              disabled={managerEmails.length === 0}
            >
              <HugeiconsIcon icon={Mail01Icon} aria-hidden="true" className="size-4" />
              Send email
            </Button>
            {job.store?.id != null && (
              <Button
                variant="outline"
                size="sm"
                disabled={geolocation.isPending}
                onClick={() => geolocation.save(job.store!.id)}
              >
                <HugeiconsIcon icon={Location01Icon} aria-hidden="true" className="size-4" />
                {geolocation.isPending ? "Saving…" : "Save geolocation"}
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetaTile
              label="Store"
              value={`${job.retailer?.title ?? ""} #${job.store?.store_no ?? ""}: ${job.store?.title ?? ""}${job.store?.address1 ? ` (${job.store.address1})` : ""}`}
            />
            <MetaTile label="Program" value={job.program?.title ?? "—"} />
            <MetaTile label="Cycle" value={job.cycle?.title ?? "—"} />
            <MetaTile label="Starts on" value={formatUtcDate(job.visit?.opens_at)} />
            <MetaTile label="Due on" value={formatUtcDate(job.visit?.closes_at)} />
            <MetaTile label="Planned time" value={formatMinutes(job.visit?.planned_minutes)} />
          </div>
        </CardContent>
      </Card>

      <SectionCard title="Documents">
        {job.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents for this visit.</p>
        ) : (
          <ul className="divide-y">
            {job.documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 py-2 text-sm">
                <HugeiconsIcon
                  icon={File01Icon}
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
                {doc.location ? (
                  <a
                    href={doc.location}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate underline-offset-2 hover:underline"
                  >
                    {doc.title}
                  </a>
                ) : (
                  <span className="truncate">{doc.title}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Questions">
        <JobQuestionsList job={job} />
      </SectionCard>

      <SectionCard title="Photos">
        <JobPhotosList job={job} />
      </SectionCard>

      <SectionCard title="Submit">
        {maySubmit ? (
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-2">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                aria-hidden="true"
                className="size-4 text-green-600"
              />
              This visit may be submitted.
            </p>
            {showPendingWarning && job.status === "pending" && (
              <p className="rounded-md bg-amber-50 p-3 text-amber-800">
                This visit has already been submitted
                {report
                  ? ` (${formatMinutes(report.actual_minutes)} on ${formatUtcDate(report.completed_on)})`
                  : ""}
                . Submitting again will replace the existing report.
              </p>
            )}
            <Button onClick={() => setReportDialogOpen(true)} disabled={submitReport.isPending}>
              {report ? "Resubmit report" : "Submit report"}
            </Button>
          </div>
        ) : !mayWork ? (
          <p className="text-sm text-muted-foreground">
            You cannot work this visit ({formatJobStatus(job.status)}).
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              The following requirements must be filled before submitting:
            </p>
            <ul className="list-inside list-disc">
              {requirements.map((requirement) => (
                <li key={`${requirement.id}-${requirement.description}`}>
                  {requirement.description}
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>

      <ReportDialog
        job={job}
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        isPending={submitReport.isPending}
        onSubmit={(payload) => {
          submitReport.mutate(payload, { onSuccess: () => setReportDialogOpen(false) });
        }}
      />
    </div>
  );
}
