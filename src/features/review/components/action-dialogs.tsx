"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  cancelJobs,
  extendJobs,
  issueJobEmailUpdate,
  reassignJobs,
  reinstateJobs,
  returnJobToItinerary,
} from "@/features/jobs/api";
import { useAllReps, useJobStatusCodes } from "@/features/jobs/hooks";
import { useMutation } from "@tanstack/react-query";
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
import { ConfirmDialog } from "@/shared/components/confirm-dialog";

/**
 * Single-visit action dialogs for the review detail, ported from the
 * `jobs-*-dialog` components. All call the bulk `jobs/{action}/` endpoints
 * with a single id (as the Angular dialogs do) and invoke `onDone` so the
 * caller can refetch.
 */

interface ActionDialogProps {
  jobId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

const NO_STATUS_CODE = "none";

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  );
}

export function ExtendDialog({ jobId, open, onOpenChange, onDone }: ActionDialogProps) {
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
        jobs: [jobId],
        opens_at: opensAt || undefined,
        closes_at: closesAt || undefined,
        planned_minutes: plannedMinutes,
      });
    },
    onSuccess: () => {
      toast.success("Successfully changed visit");
      onOpenChange(false);
      onDone();
    },
    onError: () => toast.error("Failed to change visit"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change visit</DialogTitle>
          <DialogDescription>
            Adjust the visit window and planned time. Empty fields are left unchanged.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="extend-opens">Starts on</Label>
            <Input
              id="extend-opens"
              type="date"
              value={opensAt}
              onChange={(e) => setOpensAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="extend-closes">Due on</Label>
            <Input
              id="extend-closes"
              type="date"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="extend-hours">Planned hours</Label>
              <Input
                id="extend-hours"
                type="number"
                min={0}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="extend-minutes">Planned minutes</Label>
              <Input
                id="extend-minutes"
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
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
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

export function ReassignDialog({ jobId, open, onOpenChange, onDone }: ActionDialogProps) {
  const reps = useAllReps(open);
  const [repId, setRepId] = useState<string>("");

  const mutation = useMutation({
    mutationFn: () => reassignJobs({ jobs: [jobId], users: [Number(repId)] }),
    onSuccess: () => {
      toast.success("Successfully reassigned visit");
      onOpenChange(false);
      onDone();
    },
    onError: () => toast.error("Failed to reassign visit"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reassign visit</DialogTitle>
          <DialogDescription>Choose the rep this visit should belong to.</DialogDescription>
        </DialogHeader>
        <Select value={repId} onValueChange={setRepId}>
          <SelectTrigger aria-label="Rep">
            <SelectValue placeholder={reps.isLoading ? "Loading reps…" : "Select a rep"} />
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
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!repId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Reassigning…" : "Reassign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CancelDialog({ jobId, open, onOpenChange, onDone }: ActionDialogProps) {
  const statusCodes = useJobStatusCodes({ cancelCode: true }, open);
  const [statusCode, setStatusCode] = useState<string>(NO_STATUS_CODE);
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      cancelJobs({
        jobs: [jobId],
        status_code: statusCode !== NO_STATUS_CODE ? Number(statusCode) : null,
        cancel_reason: reason.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Successfully cancelled visit");
      onOpenChange(false);
      onDone();
    },
    onError: () => toast.error("Failed to cancel visit"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cancel visit</DialogTitle>
          <DialogDescription>
            The visit will be cancelled; you can reinstate it later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Status code</Label>
            <Select value={statusCode} onValueChange={setStatusCode}>
              <SelectTrigger aria-label="Status code">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_STATUS_CODE}>No status code</SelectItem>
                {(statusCodes.data ?? []).map((code) => (
                  <SelectItem key={code.id} value={String(code.id)}>
                    {code.code}
                    {code.description ? ` — ${code.description}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">Reason</Label>
            <TextArea
              id="cancel-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep visit
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Cancelling…" : "Cancel visit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReinstateDialog({ jobId, open, onOpenChange, onDone }: ActionDialogProps) {
  const mutation = useMutation({
    mutationFn: () => reinstateJobs({ jobs: [jobId] }),
    onSuccess: () => {
      toast.success("Successfully reinstated visit");
      onDone();
    },
    onError: () => toast.error("Failed to reinstate visit"),
  });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reinstate visit"
      question="Are you sure you want to reinstate this cancelled visit?"
      confirmLabel="Reinstate"
      onConfirm={() => mutation.mutate()}
    />
  );
}

export function ReturnToItineraryDialog({
  jobId,
  open,
  onOpenChange,
  onDone,
}: ActionDialogProps) {
  const statusCodes = useJobStatusCodes({ unelevated: true }, open);
  const [statusCode, setStatusCode] = useState<string>(NO_STATUS_CODE);
  const [reason, setReason] = useState("");
  const [copyMe, setCopyMe] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      returnJobToItinerary(jobId, {
        status_code: statusCode !== NO_STATUS_CODE ? Number(statusCode) : null,
        reason: reason.trim() || undefined,
        copy_me: copyMe,
      }),
    onSuccess: () => {
      toast.success("Successfully returned visit to itinerary");
      onOpenChange(false);
      onDone();
    },
    onError: () => toast.error("Failed to return visit to itinerary"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Return to itinerary</DialogTitle>
          <DialogDescription>
            The visit goes back to the rep&apos;s itinerary; they are notified by email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Status code</Label>
            <Select value={statusCode} onValueChange={setStatusCode}>
              <SelectTrigger aria-label="Status code">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_STATUS_CODE}>No status code</SelectItem>
                {(statusCodes.data ?? []).map((code) => (
                  <SelectItem key={code.id} value={String(code.id)}>
                    {code.code}
                    {code.description ? ` — ${code.description}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="return-reason">Reason</Label>
            <TextArea
              id="return-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={copyMe}
              onChange={(e) => setCopyMe(e.target.checked)}
              className="size-4"
            />
            Send me a copy of the email
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Returning…" : "Return to itinerary"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IssueEmailUpdateDialog({
  jobId,
  open,
  onOpenChange,
  onDone,
}: ActionDialogProps) {
  const [content, setContent] = useState("");
  const [copyMe, setCopyMe] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      issueJobEmailUpdate(jobId, { content: content.trim() || undefined, copy_me: copyMe }),
    onSuccess: () => {
      toast.success("Successfully issued email update");
      onOpenChange(false);
      onDone();
    },
    onError: () => toast.error("Failed to issue email update"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Issue email update</DialogTitle>
          <DialogDescription>
            Sends an update email about this visit to its assignees.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email-update-content">Message</Label>
            <TextArea
              id="email-update-content"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={copyMe}
              onChange={(e) => setCopyMe(e.target.checked)}
              className="size-4"
            />
            Send me a copy of the email
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
