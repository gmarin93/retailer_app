"use client";

import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSession } from "@/features/auth/hooks";
import { UserRole } from "@/features/auth/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";
import { useChangeJobStatus } from "../hooks";
import { canChooseJobStatus, canShowJobStatusMenu } from "../permissions";
import {
  formatJobStatus,
  isJobOverdue,
  JOB_STATUS_LABELS,
  type JobStatus,
  type ListableJob,
} from "../schemas";

/** Angular jobs-list status pill tokens. */
const STATUS_CLASSES: Record<string, string> = {
  planned: "bg-[#f3f4f6] text-[#374151]",
  open: "bg-[#fff2e0] text-[#c2410c]",
  pending: "bg-[#e0eaff] text-[#1d4ed8]",
  completed: "bg-[#d1fae5] text-[#065f46]",
  cancelled: "bg-[#fee2e2] text-[#b91c1c]",
  invoiced: "bg-[#ede9fe] text-[#5b21b6]",
};

/** Menu dot colors — the pill text colors (Angular `_status-menu-dot`). */
const STATUS_DOT_CLASSES: Record<string, string> = {
  planned: "bg-[#374151]",
  open: "bg-[#c2410c]",
  pending: "bg-[#1d4ed8]",
  completed: "bg-[#065f46]",
  cancelled: "bg-[#b91c1c]",
  invoiced: "bg-[#5b21b6]",
};

const STATUS_CHOICES = Object.entries(JOB_STATUS_LABELS) as [JobStatus, string][];

/** Status pill for job rows and the detail header; flags overdue open visits. */
export function JobStatusChip({
  job,
  className,
  caret = false,
}: {
  job: ListableJob;
  className?: string;
  /** Shows the change-status caret (row menu trigger). */
  caret?: boolean;
}) {
  const overdue = isJobOverdue(job);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        overdue
          ? "bg-[#fee2e2] text-[#b91c1c]"
          : (STATUS_CLASSES[job.status] ?? STATUS_CLASSES.planned),
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {overdue ? "Overdue" : formatJobStatus(job.status)}
      {caret && (
        <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" className="size-3" />
      )}
    </span>
  );
}

/**
 * Status cell with the per-row "Change status" quick menu — Angular
 * jobs-list status pill + `statusMenu` (Note 169). Falls back to the plain
 * chip for roles without status-change permissions.
 */
export function JobStatusMenu({ job }: { job: ListableJob }) {
  const session = useSession();
  const role = session?.user.role ?? UserRole.FIELD_REP;
  const mutation = useChangeJobStatus();

  if (!canShowJobStatusMenu(role)) {
    return <JobStatusChip job={job} />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title="Change status"
          onClick={(event) => event.stopPropagation()}
          className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        >
          <JobStatusChip job={job} caret />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuLabel className="text-xs tracking-wide text-muted-foreground uppercase">
          Change status
        </DropdownMenuLabel>
        {STATUS_CHOICES.map(([status, label]) => (
          <DropdownMenuItem
            key={status}
            disabled={!canChooseJobStatus(role, job.status, status) || mutation.isPending}
            onSelect={() => mutation.mutate({ jobId: job.id, status })}
          >
            <span
              aria-hidden="true"
              className={cn("size-2 rounded-full", STATUS_DOT_CLASSES[status])}
            />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
