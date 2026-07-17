"use client";

import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  File01Icon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { JobPhotosList } from "@/features/jobs/components/job-photos-list";
import { JobQuestionsList } from "@/features/jobs/components/job-questions-list";
import { JobStatusChip } from "@/features/jobs/components/job-status-chip";
import { formatMinutes, formatUtcDate, type DetailedJob } from "@/features/jobs/schemas";
import { accountManagerEmails, buildJobMailto } from "@/features/itinerary/utils";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

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
 * Archived visit detail — read-only view of a past visit: meta card, email to
 * account managers, documents / questions / photos, and the submitted report.
 * The shared photo/question lists already hide their actions because
 * `canWorkJob` is false for completed/cancelled/invoiced visits.
 * Ported from `archives-detail.component`.
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
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

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase">Visit #{job.id}</p>
            <CardTitle className="text-lg">{job.customer?.title}</CardTitle>
          </div>
          <JobStatusChip job={job} />
        </CardHeader>
        <CardContent className="space-y-4">
          {managerEmails.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(buildJobMailto(job, managerEmails), "_self")}
            >
              <HugeiconsIcon icon={Mail01Icon} aria-hidden="true" className="size-4" />
              Send email
            </Button>
          )}

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

      {job.reports.length > 0 && (
        <SectionCard title="Report">
          <ul className="space-y-2 text-sm">
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
        </SectionCard>
      )}

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
        <JobPhotosList job={job} view="archived" />
      </SectionCard>
    </div>
  );
}
