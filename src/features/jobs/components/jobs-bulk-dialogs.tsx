"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
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
import { cancelJobs, extendJobs, reassignJobs, reinstateJobs } from "../api";
import { useAllReps, useJobStatusCodes } from "../hooks";

interface BulkDialogProps {
  jobIds: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

const NO_CODE = "none";

export function BulkExtendDialog({ jobIds, open, onOpenChange, onDone }: BulkDialogProps) {
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
      return extendJobs({
        jobs: jobIds,
        opens_at: opensAt || undefined,
        closes_at: closesAt || undefined,
        planned_minutes: plannedMinutes,
      });
    },
    onSuccess: () => {
      toast.success(`Updated ${jobIds.length} visit(s)`);
      onOpenChange(false);
      onDone();
    },
    onError: () => toast.error("Failed to update visits"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change visits</DialogTitle>
          <DialogDescription>
            Adjust the visit window for {jobIds.length} selected visit
            {jobIds.length === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-opens">Starts on</Label>
            <Input
              id="bulk-opens"
              type="date"
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-closes">Due on</Label>
            <Input
              id="bulk-closes"
              type="date"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-hours">Hours</Label>
              <Input
                id="bulk-hours"
                type="number"
                min={0}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-minutes">Minutes</Label>
              <Input
                id="bulk-minutes"
                type="number"
                min={0}
                max={59}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending || (!opensAt && !closesAt && !hours && !minutes)}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BulkReassignDialog({ jobIds, open, onOpenChange, onDone }: BulkDialogProps) {
  const reps = useAllReps(open);
  const [repId, setRepId] = useState("");
  const mutation = useMutation({
    mutationFn: () => reassignJobs({ jobs: jobIds, users: [Number(repId)] }),
    onSuccess: () => {
      toast.success(`Reassigned ${jobIds.length} visit(s)`);
      onOpenChange(false);
      onDone();
    },
    onError: () => toast.error("Failed to reassign"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reassign visits</DialogTitle>
          <DialogDescription>
            Choose the rep for {jobIds.length} selected visit{jobIds.length === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>
        <Select value={repId} onValueChange={setRepId}>
          <SelectTrigger aria-label="Rep">
            <SelectValue placeholder={reps.isLoading ? "Loading…" : "Select a rep"} />
          </SelectTrigger>
          <SelectContent>
            {(reps.data ?? []).map((rep) => (
              <SelectItem key={rep.id} value={String(rep.id)}>
                {rep.rep_no != null ? `#${rep.rep_no} ` : ""}
                {[rep.first_name, rep.last_name].filter(Boolean).join(" ") || `User ${rep.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!repId || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Reassigning…" : "Reassign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BulkCancelDialog({ jobIds, open, onOpenChange, onDone }: BulkDialogProps) {
  const statusCodes = useJobStatusCodes({ cancelCode: true }, open);
  const [statusCode, setStatusCode] = useState(NO_CODE);
  const [reason, setReason] = useState("");
  const mutation = useMutation({
    mutationFn: () =>
      cancelJobs({
        jobs: jobIds,
        status_code: statusCode !== NO_CODE ? Number(statusCode) : null,
        cancel_reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success(`Cancelled ${jobIds.length} visit(s)`);
      onOpenChange(false);
      onDone();
    },
    onError: () => toast.error("Failed to cancel"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel visits</DialogTitle>
          <DialogDescription>
            Cancel {jobIds.length} selected visit{jobIds.length === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Cancel code</Label>
            <Select value={statusCode} onValueChange={setStatusCode}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CODE}>None</SelectItem>
                {(statusCodes.data ?? []).map((code) => (
                  <SelectItem key={code.id} value={String(code.id)}>
                    {code.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-cancel-reason">Reason</Label>
            <Input
              id="bulk-cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Cancelling…" : "Cancel visits"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BulkReinstateDialog({ jobIds, open, onOpenChange, onDone }: BulkDialogProps) {
  const mutation = useMutation({
    mutationFn: () => reinstateJobs({ jobs: jobIds }),
    onSuccess: () => {
      toast.success(`Reinstated ${jobIds.length} visit(s)`);
      onOpenChange(false);
      onDone();
    },
    onError: () => toast.error("Failed to reinstate"),
  });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reinstate visits"
      question={`Reinstate ${jobIds.length} selected visit${jobIds.length === 1 ? "" : "s"}?`}
      isPending={mutation.isPending}
      confirmLabel={mutation.isPending ? "Working…" : "Reinstate"}
      onConfirm={() => mutation.mutate()}
    />
  );
}
