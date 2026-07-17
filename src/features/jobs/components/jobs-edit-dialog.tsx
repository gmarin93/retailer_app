"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/features/auth/hooks";
import {
  isElevated,
  isElevatedOrManager,
  isElevatedOrManagerOrSupervisor,
} from "@/features/auth/permissions";
import { UserRole } from "@/features/auth/types";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useCyclesByDate } from "@/shared/services/entities/cycles";
import { editJobs } from "../api";
import { JOB_STATUS_OPTIONS } from "../filters";
import { useJobStatusCodes } from "../hooks";

const NONE = "__none__";

interface JobsEditDialogProps {
  jobIds: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

/** Bulk edit dialog — `POST jobs/edit/` (Angular `JobsEditDialog`). */
export function JobsEditDialog({ jobIds, open, onOpenChange, onDone }: JobsEditDialogProps) {
  const session = useSession();
  const role = session?.user.role ?? UserRole.FIELD_REP;
  const canStatus = isElevated(role);
  const canStatusCode = isElevatedOrManagerOrSupervisor(role);
  const canDates = isElevatedOrManager(role);
  const canMeta = isElevated(role);

  const statusCodes = useJobStatusCodes({ unelevated: !isElevated(role) }, open && canStatusCode);
  const cycles = useCyclesByDate();

  const [status, setStatus] = useState(NONE);
  const [statusCode, setStatusCode] = useState(NONE);
  const [cycleId, setCycleId] = useState(NONE);
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      const plannedMinutes =
        hours !== "" || minutes !== ""
          ? (Number(hours) || 0) * 60 + (Number(minutes) || 0)
          : undefined;
      return editJobs({
        jobs: jobIds,
        status: status !== NONE ? status : undefined,
        status_code:
          statusCode === NONE ? undefined : statusCode === "null" ? null : statusCode,
        cycle: cycleId !== NONE ? Number(cycleId) : undefined,
        opens_at: opensAt || undefined,
        closes_at: closesAt || undefined,
        planned_minutes: plannedMinutes,
      });
    },
    onSuccess: (result) => {
      const changed = result.jobs_changed?.length ?? 0;
      const errored = result.jobs_errored?.length ?? 0;
      toast.success(
        errored > 0
          ? `Updated ${changed} visit(s); ${errored} failed`
          : `Updated ${changed || jobIds.length} visit(s)`,
      );
      onOpenChange(false);
      onDone();
    },
    onError: () => toast.error("Failed to edit visits"),
  });

  const hasChanges =
    status !== NONE ||
    statusCode !== NONE ||
    cycleId !== NONE ||
    !!opensAt ||
    !!closesAt ||
    hours !== "" ||
    minutes !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit visits</DialogTitle>
          <DialogDescription>
            Update fields for {jobIds.length} selected visit{jobIds.length === 1 ? "" : "s"}.
            Empty fields are left unchanged.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {canStatus && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Unchanged" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unchanged</SelectItem>
                  {JOB_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {canStatusCode && (
            <div className="space-y-1.5">
              <Label>Status code</Label>
              <Select value={statusCode} onValueChange={setStatusCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Unchanged" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unchanged</SelectItem>
                  <SelectItem value="null">Clear code</SelectItem>
                  {(statusCodes.data ?? []).map((code) => (
                    <SelectItem key={code.id} value={code.code}>
                      {code.code}
                      {code.description ? ` — ${code.description}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {canMeta && (
            <div className="space-y-1.5">
              <Label>Cycle</Label>
              <Select value={cycleId} onValueChange={setCycleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Unchanged" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unchanged</SelectItem>
                  {(cycles.data ?? []).map((cycle) => (
                    <SelectItem key={cycle.id} value={String(cycle.id)}>
                      {cycle.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {canDates && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-opens">Starts on</Label>
                  <Input
                    id="edit-opens"
                    type="date"
                    value={opensAt}
                    onChange={(e) => setOpensAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-closes">Due on</Label>
                  <Input
                    id="edit-closes"
                    type="date"
                    value={closesAt}
                    onChange={(e) => setClosesAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-hours">Planned hours</Label>
                  <Input
                    id="edit-hours"
                    type="number"
                    min={0}
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-minutes">Planned minutes</Label>
                  <Input
                    id="edit-minutes"
                    type="number"
                    min={0}
                    max={59}
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!hasChanges || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
