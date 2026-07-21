"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Camera01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  File01Icon,
  HelpCircleIcon,
  Location01Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/features/auth/hooks";
import { JobDocumentsChips } from "@/features/jobs/components/job-documents-chips";
import { JobPhotosList } from "@/features/jobs/components/job-photos-list";
import { JobQuestionsList } from "@/features/jobs/components/job-questions-list";
import { VisitAccordion } from "@/features/jobs/components/visit-accordion";
import { VisitSummaryCard } from "@/features/jobs/components/visit-summary-card";
import { useSaveGeolocation, useSubmitReport } from "@/features/jobs/hooks";
import {
  formatJobStatus,
  formatMinutes,
  formatUtcDate,
  type DetailedJob,
} from "@/features/jobs/schemas";
import { Button } from "@/shared/components/ui/button";
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

/**
 * Itinerary visit detail — Angular `itinerary-detail-*` layout:
 * Back + title → visit summary card → accordion (Documents / Questions / Photos / Submit).
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
  /** Reset accordion step when the selected visit changes without an effect. */
  const [stepState, setStepState] = useState({ jobId: job.id, step: 1 });
  const activeStep = stepState.jobId === job.id ? stepState.step : 1;
  function setActiveStep(step: number) {
    setStepState({ jobId: job.id, step });
  }

  const [pendingWarningJobId, setPendingWarningJobId] = useState<number | null>(null);
  const showPendingWarning = pendingWarningJobId === job.id;
  useEffect(() => {
    if (job.status !== "pending") return;
    const jobId = job.id;
    const timer = setTimeout(() => setPendingWarningJobId(jobId), 5000);
    return () => clearTimeout(timer);
  }, [job.id, job.status]);

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

  const role = session?.user.role;
  const userId = session?.user.id;
  const mayWork = role != null && userId != null ? canWorkJob(job, role, userId) : false;
  const maySubmit =
    role != null && userId != null ? canSubmitReport(job, role, userId) : false;
  const requirements = unfilledJobRequirements(job);
  const report = userId != null ? myReport(job, userId) : null;
  const managerEmails = accountManagerEmails(job);

  const onEmail = () => {
    window.open(buildJobMailto(job, managerEmails), "_self");
  };

  const steps = [
    {
      id: "documents",
      title: "Documents",
      icon: File01Icon,
      content: <JobDocumentsChips job={job} />,
    },
    {
      id: "questions",
      title: "Questions",
      icon: HelpCircleIcon,
      content: <JobQuestionsList job={job} />,
    },
    {
      id: "photos",
      title: "Photos",
      icon: Camera01Icon,
      content: <JobPhotosList job={job} showCardBadge />,
    },
    {
      id: "submit",
      title: "Submit",
      icon: Clock01Icon,
      content: maySubmit ? (
        <div className="space-y-4 text-sm">
          <p className="flex items-center gap-2">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              aria-hidden="true"
              className="size-5 text-green-600"
            />
            This visit may be submitted.
          </p>
          {showPendingWarning && job.status === "pending" && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
              This visit has already been submitted
              {report
                ? ` (${formatMinutes(report.actual_minutes)} on ${formatUtcDate(report.completed_on)})`
                : ""}
              . Submitting again will allow you to change the time and date of the previous
              submission.
            </p>
          )}
          <Button
            onClick={() => setReportDialogOpen(true)}
            disabled={submitReport.isPending}
            aria-busy={submitReport.isPending}
          >
            <HugeiconsIcon icon={Clock01Icon} aria-hidden="true" className="size-4" />
            {submitReport.isPending
              ? "Submitting…"
              : report
                ? "Resubmit report"
                : "Submit"}
          </Button>
        </div>
      ) : !mayWork ? (
        <div className="space-y-2 text-sm">
          <p className="font-medium">This visit cannot be submitted.</p>
          <p className="text-muted-foreground">
            This visit is not currently open, and may have already been reviewed (
            {formatJobStatus(job.status)}).
          </p>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <p className="font-medium">This visit cannot be submitted.</p>
          <p className="text-muted-foreground">
            This visit does not have all of the required photos and questions filled out:
          </p>
          <ul className="list-inside list-disc text-muted-foreground">
            {requirements.map((requirement) => (
              <li key={`${requirement.id}-${requirement.description}`}>
                {requirement.description}
              </li>
            ))}
          </ul>
        </div>
      ),
    },
  ];

  if (!session) return null;

  return (
    <div className="mx-auto max-w-[1040px] space-y-3 sm:space-y-5">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <Button variant="outline" size="sm" onClick={onClose}>
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

      <VisitSummaryCard
        job={job}
        storeFormat="itinerary"
        actions={
          <>
            <Button size="sm" onClick={onEmail} disabled={managerEmails.length === 0}>
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
          </>
        }
      />

      <VisitAccordion
        steps={steps}
        activeStep={activeStep}
        onStepChange={setActiveStep}
      />

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
