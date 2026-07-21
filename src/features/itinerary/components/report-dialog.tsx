"use client";

import { format } from "date-fns";
import { useForm, useWatch } from "react-hook-form";
import { useSession } from "@/features/auth/hooks";
import { canReportOnBehalf } from "@/features/auth/permissions";
import type { JobReportPayload } from "@/features/jobs/api";
import {
  formatMinutes,
  type DetailedJob,
  type JobReport,
} from "@/features/jobs/schemas";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { myReport } from "../utils";

function assigneeLabel(assignee: {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}): string {
  const name = [assignee.first_name, assignee.last_name].filter(Boolean).join(" ");
  return name || assignee.email || `User #${assignee.id}`;
}

interface ReportFormValues {
  hours: number;
  minutes: number;
  date: string;
  reportedBy: string;
}

/**
 * Report submitter dialog (hours / minutes / completion date, plus an
 * on-behalf assignee selector for elevated roles) — ported from
 * `report-submitter-dialog.component.ts` + `ItineraryDetailBloc.submitReport`.
 * Pass `editReport` for Review's edit-existing flow (no reported-by picker).
 */
export function ReportDialog({
  job,
  open,
  onOpenChange,
  onSubmit,
  isPending,
  editReport,
}: {
  job: DetailedJob;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: JobReportPayload) => void;
  isPending: boolean;
  /** When set, dialog seeds from this report and hides the assignee picker. */
  editReport?: JobReport | null;
}) {
  const session = useSession();
  const role = session?.user.role;
  const isEdit = editReport != null;
  const existingReport = isEdit
    ? editReport
    : session
      ? myReport(job, session.user.id)
      : null;
  const plannedMinutes = job.visit?.planned_minutes ?? 0;
  const initialMinutes = existingReport ? existingReport.actual_minutes : plannedMinutes;

  const showAssignees =
    !isEdit && !!role && canReportOnBehalf(role) && job.assignees.length >= 1;

  const form = useForm<ReportFormValues>({
    values: {
      hours: Math.floor(initialMinutes / 60),
      minutes: initialMinutes % 60,
      date: existingReport?.completed_on
        ? format(new Date(existingReport.completed_on), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      reportedBy: showAssignees ? String(job.assignees[0]!.id) : "",
    },
  });

  const { errors } = form.formState;
  const hours = useWatch({ control: form.control, name: "hours" });
  const minutes = useWatch({ control: form.control, name: "minutes" });
  const reportedBy = useWatch({ control: form.control, name: "reportedBy" });
  const actualMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
  const timeWarning =
    actualMinutes > plannedMinutes
      ? "Over planned time. Please ensure this is correct before submitting."
      : actualMinutes < plannedMinutes
        ? "Under planned time. Please ensure this is correct before submitting."
        : null;

  const submit = form.handleSubmit((values) => {
    const payload: JobReportPayload = {
      actual_minutes: (Number(values.hours) || 0) * 60 + (Number(values.minutes) || 0),
      completed_on: values.date,
    };
    if (showAssignees && values.reportedBy) {
      payload.reported_by = Number(values.reportedBy);
    }
    onSubmit(payload);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit report" : "Submit report"}</DialogTitle>
          <DialogDescription>Planned time: {formatMinutes(plannedMinutes)}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!errors.hours || undefined}>
                <FieldLabel htmlFor="report-hours">Hours</FieldLabel>
                <Input
                  id="report-hours"
                  type="number"
                  min={0}
                  aria-invalid={!!errors.hours}
                  {...form.register("hours", { required: "Required", min: 0 })}
                />
                {errors.hours && <FieldError>{errors.hours.message}</FieldError>}
              </Field>
              <Field data-invalid={!!errors.minutes || undefined}>
                <FieldLabel htmlFor="report-minutes">Minutes</FieldLabel>
                <Input
                  id="report-minutes"
                  type="number"
                  min={0}
                  max={59}
                  aria-invalid={!!errors.minutes}
                  {...form.register("minutes", { required: "Required", min: 0 })}
                />
                {errors.minutes && <FieldError>{errors.minutes.message}</FieldError>}
              </Field>
            </div>

            {timeWarning && <p className="text-xs text-amber-600">{timeWarning}</p>}

            <Field data-invalid={!!errors.date || undefined}>
              <FieldLabel htmlFor="report-date">Completed on</FieldLabel>
              <Input
                id="report-date"
                type="date"
                aria-invalid={!!errors.date}
                {...form.register("date", { required: "Required" })}
              />
              {errors.date && <FieldError>{errors.date.message}</FieldError>}
            </Field>

            {showAssignees && (
              <Field>
                <FieldLabel htmlFor="report-reported-by">Reported by</FieldLabel>
                <Select
                  value={reportedBy ?? ""}
                  onValueChange={(value) => form.setValue("reportedBy", value)}
                >
                  <SelectTrigger id="report-reported-by">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {job.assignees.map((assignee) => (
                      <SelectItem key={assignee.id} value={String(assignee.id)}>
                        {assigneeLabel(assignee)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </FieldGroup>

          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (isEdit ? "Saving…" : "Submitting…") : isEdit ? "Save" : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
