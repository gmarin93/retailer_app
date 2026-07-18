"use client";

import {
  Calendar03Icon,
  Clock01Icon,
  Folder01Icon,
  Store01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";
import { UserAvatar } from "@/shared/components/user/user-avatar";
import { cn } from "@/shared/lib/utils";
import { formatMinutes, formatUtcDate, type DetailedJob } from "../schemas";
import { JobStatusChip } from "./job-status-chip";

type MetaTone = "blue" | "violet" | "teal" | "red" | "amber";

const META_ICON_TONES: Record<MetaTone, string> = {
  blue: "bg-primary/12 text-primary",
  violet: "bg-violet-500/12 text-violet-600 dark:text-violet-300",
  teal: "bg-teal-500/12 text-teal-600 dark:text-teal-300",
  red: "bg-[#e85a3a]/12 text-[#e85a3a]",
  amber: "bg-amber-500/14 text-amber-600 dark:text-amber-300",
};

function VisitMetaTile({
  label,
  value,
  icon,
  tone,
  wide,
}: {
  label: string;
  value: string;
  icon: IconSvgElement;
  tone: MetaTone;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-3",
        wide && "sm:col-span-2",
      )}
    >
      <span
        className={cn(
          "inline-flex size-[38px] shrink-0 items-center justify-center rounded-[10px]",
          META_ICON_TONES[tone],
        )}
      >
        <HugeiconsIcon icon={icon} className="size-5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <span className="text-[13.5px] leading-snug font-medium break-words text-foreground">
          {value}
        </span>
      </div>
    </div>
  );
}

export interface VisitSummaryCardProps {
  job: DetailedJob;
  /** Action buttons rendered under the head (email, edit, etc.). */
  actions?: ReactNode;
  /** Extra content below meta tiles (reports, documents, cancel reason). */
  children?: ReactNode;
  /** Include assignees meta tile when present (review). */
  showAssignees?: boolean;
  /**
   * Store value style:
   * - review: retailer #code: address
   * - itinerary: retailer #store_no: title (address)
   */
  storeFormat?: "review" | "itinerary";
  className?: string;
}

/**
 * Angular `_visit-card` summary: eyebrow, title, status chip, colored meta tiles.
 * Shared by Review, Itinerary, and Archives detail screens.
 */
export function VisitSummaryCard({
  job,
  actions,
  children,
  showAssignees = false,
  storeFormat = "itinerary",
  className,
}: VisitSummaryCardProps) {
  const storeCode =
    (job.store as { code?: string | number | null } | null | undefined)?.code ??
    job.store?.store_no;

  const storeValue =
    storeFormat === "review"
      ? [job.retailer?.title, storeCode != null ? `#${storeCode}:` : null, job.store?.address1]
          .filter(Boolean)
          .join(" ")
      : [
          job.retailer?.title,
          job.store?.store_no != null ? `#${job.store.store_no}:` : null,
          job.store?.title,
          job.store?.address1 ? `(${job.store.address1})` : null,
        ]
          .filter(Boolean)
          .join(" ");

  const programValue = [job.customer?.title, job.program?.title].filter(Boolean).join(": ");

  const assignees =
    job.assignments.length > 0
      ? job.assignments.map((assignment) => assignment.assignee)
      : job.assignees;

  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-[14px] border border-border/80 bg-card p-4 shadow-[0_2px_8px_rgba(17,24,39,0.06)] sm:p-[18px_20px_20px]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="block text-[11px] font-bold tracking-wide text-primary uppercase">
            Visit #{job.id}
          </span>
          <h2 className="mt-0.5 text-base font-bold tracking-tight text-foreground sm:text-lg">
            {job.customer?.title ?? "Visit"}
          </h2>
        </div>
        <JobStatusChip job={job} />
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-2 [&>button]:max-sm:text-xs">
          {actions}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <VisitMetaTile
          label="Store"
          value={storeValue || "—"}
          icon={Store01Icon}
          tone="blue"
          wide
        />
        <VisitMetaTile
          label="Program"
          value={programValue || "—"}
          icon={Folder01Icon}
          tone="violet"
        />
        {showAssignees && assignees.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
              <HugeiconsIcon icon={UserGroupIcon} size={14} strokeWidth={1.8} />
              Assignees
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {assignees.map((user) => (
                <div key={user.id} className="flex items-center gap-2">
                  <UserAvatar user={user} size={32} />
                  <span className="text-sm font-medium text-foreground">
                    {[user.first_name, user.last_name].filter(Boolean).join(" ") ||
                      user.username ||
                      "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <VisitMetaTile
          label="Starts on"
          value={formatUtcDate(job.visit?.opens_at)}
          icon={Calendar03Icon}
          tone="teal"
        />
        <VisitMetaTile
          label="Due on"
          value={formatUtcDate(job.visit?.closes_at)}
          icon={Calendar03Icon}
          tone="red"
        />
        <VisitMetaTile
          label="Planned time"
          value={formatMinutes(job.visit?.planned_minutes)}
          icon={Clock01Icon}
          tone="amber"
        />
      </div>

      {children}
    </section>
  );
}
