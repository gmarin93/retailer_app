"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Camera01Icon,
  File01Icon,
  HelpCircleIcon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { accountManagerEmails, buildJobMailto } from "@/features/itinerary/utils";
import { JobDocumentsChips } from "@/features/jobs/components/job-documents-chips";
import { JobPhotosList } from "@/features/jobs/components/job-photos-list";
import { JobQuestionsList } from "@/features/jobs/components/job-questions-list";
import { VisitAccordion } from "@/features/jobs/components/visit-accordion";
import { VisitSummaryCard } from "@/features/jobs/components/visit-summary-card";
import { formatMinutes, formatUtcDate, type DetailedJob } from "@/features/jobs/schemas";
import { Button } from "@/shared/components/ui/button";

/**
 * Archived visit detail — Angular archives accordion layout with shared visit card.
 * Photo/question lists hide work actions because `canWorkJob` is false for archived jobs.
 */
export function ArchivesDetail({
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
  const managerEmails = accountManagerEmails(job);
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    {
      id: "documents",
      title: "Documents",
      icon: File01Icon,
      content: <JobDocumentsChips job={job} />,
    },
    {
      id: "photos",
      title: "Photos",
      icon: Camera01Icon,
      content: <JobPhotosList job={job} view="archived" showCardBadge />,
    },
    {
      id: "questions",
      title: "Questions",
      icon: HelpCircleIcon,
      content: <JobQuestionsList job={job} showCardBadge />,
    },
  ];

  return (
    <div className="mx-auto max-w-[1040px] space-y-5">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <Button variant="outline" size="sm" onClick={onClose}>
          <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" className="size-4" />
          Back
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">Visit details</h1>
          <p className="text-sm text-muted-foreground">
            Review documents, photos, and questions from this archived visit.
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
          managerEmails.length > 0 ? (
            <Button
              size="sm"
              onClick={() => window.open(buildJobMailto(job, managerEmails), "_self")}
            >
              <HugeiconsIcon icon={Mail01Icon} aria-hidden="true" className="size-4" />
              Send email
            </Button>
          ) : null
        }
      >
        {job.reports.length > 0 ? (
          <div className="space-y-2 border-t border-border pt-4 text-sm">
            <p className="font-bold">Report</p>
            <ul className="space-y-1">
              {job.reports.map((report) => (
                <li key={report.id}>
                  {formatMinutes(report.actual_minutes)} — completed{" "}
                  {formatUtcDate(report.completed_on)}
                  {report.reported_by_user
                    ? ` by ${[report.reported_by_user.first_name, report.reported_by_user.last_name].filter(Boolean).join(" ")}`
                    : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </VisitSummaryCard>

      <VisitAccordion
        steps={steps}
        activeStep={activeStep}
        onStepChange={setActiveStep}
      />
    </div>
  );
}
