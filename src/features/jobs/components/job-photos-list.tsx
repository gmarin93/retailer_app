"use client";

import {
  Alert02Icon,
  Camera01Icon,
  Delete02Icon,
  ImageAdd01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { useSession } from "@/features/auth/hooks";
import { isElevatedOrManagerOrSupervisor } from "@/features/auth/permissions";
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
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { cn } from "@/shared/lib/utils";
import { canWorkJob, isAssignedToJob } from "../permissions";
import type { JobsView } from "../api";
import {
  useDeleteJobPhoto,
  useSetPhotoFeedback,
  useSetPhotoStatus,
  useUploadJobPhotos,
} from "../hooks";
import {
  PHOTO_RESPONSE_STATUS_LABELS,
  type DetailedJob,
  type JobPhotoRequest,
  type JobPhotoResponse,
} from "../schemas";
import { PhotoUploadDialog } from "./photo-upload-dialog";

const MAX_RESPONSES = 3;

/** Roles that see photo review status/feedback (elevated…rep, not customers). */
function canSeePhotoReview(role: UserRole): boolean {
  return isElevatedOrManagerOrSupervisor(role) || role === UserRole.FIELD_REP;
}

function statusClasses(status: string): string {
  if (status === "accepted") return "text-green-700";
  if (status === "rejected") return "text-red-700";
  return "text-muted-foreground";
}

/**
 * Photo requests with responses, upload (single via `photo/`, multi via the
 * batch `photosVisit/` endpoint), and delete — ported from
 * `job-photos-list.component.ts`.
 */
export function JobPhotosList({
  job,
  reviewMode = false,
  view,
  onPhotoClick,
  showCardBadge = false,
}: {
  job: DetailedJob;
  /** Shows accept/reject/feedback controls (review page, permitted roles). */
  reviewMode?: boolean;
  view?: JobsView;
  /** When set (e.g. review gallery), photo click opens the gallery instead of a new tab. */
  onPhotoClick?: (response: JobPhotoResponse) => void;
  /** Angular review/itinerary card chrome (PHOTO badge + bordered card). */
  showCardBadge?: boolean;
}) {
  const session = useSession();
  const upload = useUploadJobPhotos(job.id);
  const deletePhoto = useDeleteJobPhoto(job.id);
  const setStatus = useSetPhotoStatus(job.id, view);
  const setFeedback = useSetPhotoFeedback(job.id, view);
  const [feedbackTarget, setFeedbackTarget] = useState<JobPhotoResponse | null>(null);
  const [feedbackDraft, setFeedbackDraft] = useState("");

  const [uploadTarget, setUploadTarget] = useState<JobPhotoRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    request: JobPhotoRequest;
    response: JobPhotoResponse;
  } | null>(null);

  if (!session) return null;
  const role = session.user.role;
  const mayWork = canWorkJob(job, role, session.user.id);
  const showReview = canSeePhotoReview(role);
  // Accept/reject is elevated…supervisor (canAcceptRejectPhotos); reps see status only.
  const mayAcceptReject = reviewMode && isElevatedOrManagerOrSupervisor(role);
  // Non-assignees pick which assignee to upload on behalf of in the dialog.
  const notAssigned = !isAssignedToJob(job, session.user.id);

  if (job.photo_requests.length === 0) {
    return <p className="text-sm text-muted-foreground">No photo requests for this visit.</p>;
  }

  return (
    <ul className="space-y-3">
      {job.photo_requests.map((request) => {
        const responses = request.job_responses;
        const canAdd = mayWork && responses.length < MAX_RESPONSES;
        const isUploading = upload.isPending && uploadTarget?.id === request.id;
        return (
          <li
            key={request.id}
            className={cn(
              "text-sm",
              showCardBadge && "rounded-xl border border-border bg-card p-3 shadow-sm",
            )}
          >
            <div className="flex items-start gap-3">
              {showCardBadge ? (
                <div className="inline-flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary text-[10px] font-bold tracking-wide text-primary-foreground uppercase">
                  <HugeiconsIcon icon={Camera01Icon} className="size-4" aria-hidden="true" />
                  Photo
                </div>
              ) : null}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start gap-2">
                  {request.required && mayWork ? (
                    <HugeiconsIcon
                      icon={Alert02Icon}
                      className="mt-0.5 size-4 shrink-0 text-amber-500"
                      aria-label="Required"
                    />
                  ) : null}
                  <p className="font-medium">
                    {request.description}
                    {request.required && !mayWork ? (
                      <span className="ml-1 text-destructive">*</span>
                    ) : null}
                  </p>
                </div>

                {responses.length === 0 ? (
                  <p className="text-muted-foreground">{showCardBadge ? "No photo" : "No photos yet."}</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {responses.map((response) => (
                      <div key={response.id} className="w-28">
                        <div className="group relative">
                          <button
                            type="button"
                            onClick={() =>
                              onPhotoClick
                                ? onPhotoClick(response)
                                : window.open(response.photo_location, "_blank")
                            }
                            className="block overflow-hidden rounded-md border"
                            aria-label={
                              onPhotoClick
                                ? "Open photo in gallery"
                                : "Open photo in a new tab"
                            }
                          >
                            {/* Presigned storage URL — next/image not applicable. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={response.photo_location}
                              alt={request.description}
                              loading="lazy"
                              className="size-28 object-cover"
                            />
                          </button>
                          {mayWork && (
                            <button
                              type="button"
                              aria-label="Delete photo"
                              disabled={deletePhoto.isPending}
                              onClick={() => setDeleteTarget({ request, response })}
                              className="absolute top-1 right-1 rounded-full bg-background/90 p-1 opacity-0 shadow transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                            >
                              <HugeiconsIcon
                                icon={Delete02Icon}
                                aria-hidden="true"
                                className="size-3.5 text-destructive"
                              />
                            </button>
                          )}
                        </div>
                        {showReview && (
                          <div className="mt-1 text-xs">
                            <p className={statusClasses(response.status)}>
                              {PHOTO_RESPONSE_STATUS_LABELS[response.status] ?? response.status}
                            </p>
                            {response.feedback && (
                              <p className="text-muted-foreground">{response.feedback}</p>
                            )}
                          </div>
                        )}
                        {mayAcceptReject && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            <Button
                              variant={response.status === "accepted" ? "default" : "outline"}
                              size="sm"
                              className="h-6 px-2 text-xs"
                              disabled={setStatus.isPending}
                              onClick={() =>
                                setStatus.mutate({
                                  photoResponseId: response.id,
                                  status:
                                    response.status === "accepted" ? "pending" : "accepted",
                                })
                              }
                            >
                              Accept
                            </Button>
                            <Button
                              variant={
                                response.status === "rejected" ? "destructive" : "outline"
                              }
                              size="sm"
                              className="h-6 px-2 text-xs"
                              disabled={setStatus.isPending}
                              onClick={() =>
                                setStatus.mutate({
                                  photoResponseId: response.id,
                                  status:
                                    response.status === "rejected" ? "pending" : "rejected",
                                })
                              }
                            >
                              Reject
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => {
                                setFeedbackDraft(response.feedback ?? "");
                                setFeedbackTarget(response);
                              }}
                            >
                              Feedback
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {canAdd ? (
                  <div className={cn(showCardBadge && "flex justify-end")}>
                    <Button
                      variant={showCardBadge ? "default" : "outline"}
                      size="sm"
                      className="rounded-full"
                      disabled={isUploading}
                      onClick={() => setUploadTarget(request)}
                    >
                      <HugeiconsIcon
                        icon={ImageAdd01Icon}
                        aria-hidden="true"
                        className="size-4"
                      />
                      {isUploading
                        ? "Uploading…"
                        : showCardBadge
                          ? "Upload photo"
                          : "Add photo"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}

      <PhotoUploadDialog
        open={uploadTarget !== null}
        onOpenChange={(open) => !open && setUploadTarget(null)}
        assignees={notAssigned ? job.assignees : undefined}
        isPending={upload.isPending}
        onSubmit={(files, uploadedBy) => {
          if (!uploadTarget) return;
          upload.mutate(
            { photoRequestId: uploadTarget.id, files, uploadedBy },
            { onSuccess: () => setUploadTarget(null) },
          );
        }}
      />

      <Dialog
        open={feedbackTarget !== null}
        onOpenChange={(open) => {
          if (!open && setFeedback.isPending) return;
          if (!open) setFeedbackTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Photo feedback</DialogTitle>
            <DialogDescription>
              You may provide feedback for this photo that will be visible to other users.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={feedbackDraft}
            onChange={(event) => setFeedbackDraft(event.target.value)}
            rows={3}
            disabled={setFeedback.isPending}
            aria-label="Photo feedback"
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          <DialogFooter>
            <Button
              variant="ghost"
              disabled={setFeedback.isPending}
              onClick={() => setFeedbackTarget(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={setFeedback.isPending}
              aria-busy={setFeedback.isPending}
              onClick={() => {
                if (!feedbackTarget) return;
                setFeedback.mutate(
                  {
                    photoResponseId: feedbackTarget.id,
                    feedback: feedbackDraft.trim(),
                  },
                  { onSuccess: () => setFeedbackTarget(null) },
                );
              }}
            >
              {setFeedback.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete photo"
        question="Are you sure you want to delete this photo?"
        destructive
        isPending={deletePhoto.isPending}
        confirmLabel={deletePhoto.isPending ? "Deleting…" : "Yes"}
        onConfirm={() => {
          if (!deleteTarget) return;
          deletePhoto.mutate(
            {
              photoRequestId: deleteTarget.request.id,
              photoResponseId: deleteTarget.response.id,
            },
            { onSuccess: () => setDeleteTarget(null) },
          );
        }}
      />
    </ul>
  );
}
