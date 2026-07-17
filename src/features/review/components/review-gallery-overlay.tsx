"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/features/auth/hooks";
import { isElevatedOrManagerOrSupervisor } from "@/features/auth/permissions";
import {
  usePostJobReview,
  useSetPhotoFeedback,
  useSetPhotoStatus,
} from "@/features/jobs/hooks";
import type {
  DetailedJob,
  JobPhotoRequest,
  JobPhotoResponse,
  JobReview,
} from "@/features/jobs/schemas";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

interface FlatPhoto {
  index: number;
  request: JobPhotoRequest;
  response: JobPhotoResponse;
}

function flattenPhotos(job: DetailedJob): FlatPhoto[] {
  const items: FlatPhoto[] = [];
  let index = 0;
  for (const request of job.photo_requests) {
    for (const response of request.job_responses) {
      items.push({ index, request, response });
      index += 1;
    }
  }
  return items;
}

function myReview(job: DetailedJob, userId: number): JobReview | null {
  return job.reviews.find((review) => review.reviewed_by?.id === userId) ?? null;
}

function initialPhotoIndex(photos: FlatPhoto[], photoResponseId: number | null): number {
  const next = photos.findIndex((photo) => photo.response.id === photoResponseId);
  return next >= 0 ? next : 0;
}

interface ReviewGalleryOverlayProps {
  job: DetailedJob;
  open: boolean;
  initialPhotoResponseId: number | null;
  onOpenChange: (open: boolean) => void;
  onEmail: () => void;
}

/**
 * Full-screen review photo gallery — accept/reject/feedback, download, email,
 * and visit star rating (Angular `ReviewDetailGalleryOverlayComponent`).
 * Remount via `key` when opening so the initial photo index resets cleanly.
 */
export function ReviewGalleryOverlay({
  job,
  open,
  initialPhotoResponseId,
  onOpenChange,
  onEmail,
}: ReviewGalleryOverlayProps) {
  const session = useSession();
  const photos = flattenPhotos(job);
  const [index, setIndex] = useState(() => initialPhotoIndex(photos, initialPhotoResponseId));
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState("");

  const setStatus = useSetPhotoStatus(job.id, "reviewable");
  const setFeedback = useSetPhotoFeedback(job.id, "reviewable");
  const postReview = usePostJobReview(job.id);

  const safeIndex = Math.min(index, Math.max(photos.length - 1, 0));
  const current = photos[safeIndex] ?? null;
  const mayAcceptReject = !!session && isElevatedOrManagerOrSupervisor(session.user.role);
  const rating = session ? (myReview(job, session.user.id)?.rating ?? 0) : 0;

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (event.key === "ArrowLeft") {
        setIndex((value) => Math.max(0, value - 1));
      }
      if (event.key === "ArrowRight") {
        setIndex((value) => Math.min(photos.length - 1, value + 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange, photos.length]);

  if (!open || !current) return null;

  const assigneeNames =
    job.assignments.length > 0
      ? job.assignments
          .map((a) => [a.assignee.first_name, a.assignee.last_name].filter(Boolean).join(" "))
          .join(", ")
      : "—";

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-gallery-title"
        onClick={() => onOpenChange(false)}
      >
        <div
          className="flex max-h-[95vh] w-full max-w-4xl flex-col gap-3 rounded-lg bg-background p-4 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 id="review-gallery-title" className="text-base font-semibold">
                Visit #{job.id} Photos
              </h2>
              <p className="text-xs text-muted-foreground">
                {assigneeNames} · {job.program?.title ?? "—"} · {job.retailer?.title ?? "—"} ·{" "}
                {job.store?.title ?? "—"}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>

          <p className="text-sm font-medium">{current.request.description}</p>

          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((photo) => (
                <button
                  key={photo.response.id}
                  type="button"
                  onClick={() => setIndex(photo.index)}
                  className={cn(
                    "size-14 shrink-0 overflow-hidden rounded border focus-visible:ring-2 focus-visible:ring-ring/30",
                    photo.index === index && "ring-2 ring-primary",
                  )}
                  aria-label={`Photo ${photo.index + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.response.photo_location}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="relative min-h-0 flex-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.response.photo_location}
              alt={current.request.description}
              className="mx-auto max-h-[50vh] w-auto max-w-full object-contain"
            />
            {photos.length > 1 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute top-1/2 left-2 -translate-y-1/2"
                  disabled={index <= 0}
                  onClick={() => setIndex((value) => value - 1)}
                >
                  Prev
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute top-1/2 right-2 -translate-y-1/2"
                  disabled={index >= photos.length - 1}
                  onClick={() => setIndex((value) => value + 1)}
                >
                  Next
                </Button>
              </>
            )}
          </div>

          {current.response.feedback && (
            <p className="text-sm">
              <span className="font-medium">Photo comment:</span> {current.response.feedback}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            {mayAcceptReject && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={setFeedback.isPending}
                  onClick={() => {
                    setFeedbackDraft(current.response.feedback ?? "");
                    setFeedbackOpen(true);
                  }}
                >
                  Photo feedback
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={current.response.status === "accepted" ? "default" : "outline"}
                  disabled={setStatus.isPending}
                  onClick={() =>
                    setStatus.mutate({
                      photoResponseId: current.response.id,
                      status: current.response.status === "accepted" ? "pending" : "accepted",
                    })
                  }
                >
                  Accept photo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={current.response.status === "rejected" ? "destructive" : "outline"}
                  disabled={setStatus.isPending}
                  onClick={() =>
                    setStatus.mutate({
                      photoResponseId: current.response.id,
                      status: current.response.status === "rejected" ? "pending" : "rejected",
                    })
                  }
                >
                  Reject photo
                </Button>
              </>
            )}
            <Button asChild variant="outline" size="sm">
              <a
                href={current.response.photo_location}
                download
                target="_blank"
                rel="noreferrer"
              >
                Download photo
              </a>
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onEmail}>
              Send email
            </Button>

            <div className="ml-auto flex items-center gap-1" aria-label="Visit rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  disabled={postReview.isPending || !mayAcceptReject}
                  onClick={() => postReview.mutate(star)}
                  className={cn(
                    "px-1 text-lg leading-none hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring/30",
                    star <= rating ? "text-amber-500" : "text-muted-foreground/40",
                  )}
                  aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Photo feedback</DialogTitle>
          </DialogHeader>
          <Input
            value={feedbackDraft}
            onChange={(event) => setFeedbackDraft(event.target.value)}
            placeholder="Feedback for the rep"
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setFeedbackOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={setFeedback.isPending}
              onClick={() =>
                setFeedback.mutate(
                  {
                    photoResponseId: current.response.id,
                    feedback: feedbackDraft,
                  },
                  { onSuccess: () => setFeedbackOpen(false) },
                )
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
