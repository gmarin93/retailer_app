"use client";

import { Cancel01Icon, ImageAdd01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Field, FieldLabel } from "@/shared/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";
import type { DetailedJob } from "../schemas";

interface PhotoSlot {
  file: File;
  previewSrc: string;
}

const MAX_PHOTOS = 3;

function assigneeLabel(assignee: DetailedJob["assignees"][number]): string {
  const name = [assignee.first_name, assignee.last_name].filter(Boolean).join(" ");
  return name || assignee.email || `User #${assignee.id}`;
}

/**
 * Photo picker dialog: up to three photos via file input or drag-and-drop,
 * with previews. Resolves with the selected files (Angular
 * `PhotoUploadDialogComponent` twin). When `assignees` is provided (acting
 * user is not assigned to the visit), shows an "On behalf of" selector and
 * resolves with the chosen assignee id instead of assuming the first one.
 */
export function PhotoUploadDialog({
  open,
  onOpenChange,
  onSubmit,
  assignees,
  isPending = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (files: File[], uploadedBy?: number) => void;
  /** When set, shows the "On behalf of" selector over these users. */
  assignees?: DetailedJob["assignees"];
  isPending?: boolean;
}) {
  const [photos, setPhotos] = useState<PhotoSlot[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const showOnBehalf = (assignees?.length ?? 0) > 0;
  const [uploadedBy, setUploadedBy] = useState(() =>
    showOnBehalf ? String(assignees![0]!.id) : "",
  );

  const canAddMore = photos.length < MAX_PHOTOS;

  // Parent may set `open` false on success without going through `onOpenChange`.
  useEffect(() => {
    if (open) return;
    setPhotos((current) => {
      for (const photo of current) URL.revokeObjectURL(photo.previewSrc);
      return [];
    });
  }, [open]);

  const queueFiles = (files: FileList | File[]) => {
    const incoming = Array.from(files).filter((file) => file.type.startsWith("image/"));
    setPhotos((current) => {
      const room = MAX_PHOTOS - current.length;
      const slots = incoming.slice(0, room).map((file) => ({
        file,
        previewSrc: URL.createObjectURL(file),
      }));
      return [...current, ...slots];
    });
  };

  const reset = () => {
    for (const photo of photos) URL.revokeObjectURL(photo.previewSrc);
    setPhotos([]);
  };

  const close = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add photos</DialogTitle>
          <DialogDescription>Select up to {MAX_PHOTOS} photos to upload.</DialogDescription>
        </DialogHeader>

        <div
          role="button"
          tabIndex={0}
          onClick={() => canAddMore && !isPending && inputRef.current?.click()}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === " ") && canAddMore && !isPending) {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!isPending) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (canAddMore && !isPending) queueFiles(event.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-sm text-muted-foreground transition-colors",
            isDragging && "border-primary bg-primary/5",
            (!canAddMore || isPending) && "cursor-not-allowed opacity-50",
          )}
        >
          <HugeiconsIcon icon={ImageAdd01Icon} aria-hidden="true" className="size-8" />
          {canAddMore ? "Click or drop photos here" : "Maximum photos selected"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              if (event.target.files) queueFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        {photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {photos.map((photo, index) => (
              <div key={photo.previewSrc} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.previewSrc}
                  alt={photo.file.name}
                  className="size-20 rounded-md border object-cover"
                />
                <button
                  type="button"
                  aria-label={`Remove ${photo.file.name}`}
                  disabled={isPending}
                  onClick={() =>
                    setPhotos((current) => {
                      URL.revokeObjectURL(photo.previewSrc);
                      return current.filter((_, i) => i !== index);
                    })
                  }
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-background p-0.5 shadow disabled:opacity-50"
                >
                  <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {showOnBehalf && (
          <Field>
            <FieldLabel htmlFor="photo-uploaded-by">On behalf of</FieldLabel>
            <Select value={uploadedBy} onValueChange={setUploadedBy} disabled={isPending}>
              <SelectTrigger id="photo-uploaded-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assignees!.map((assignee) => (
                  <SelectItem key={assignee.id} value={String(assignee.id)}>
                    {assigneeLabel(assignee)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <DialogFooter>
          <Button variant="ghost" disabled={isPending} onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            disabled={photos.length === 0 || isPending}
            aria-busy={isPending}
            onClick={() => {
              onSubmit(
                photos.map((photo) => photo.file),
                showOnBehalf && uploadedBy ? Number(uploadedBy) : undefined,
              );
            }}
          >
            {isPending
              ? "Uploading…"
              : `Upload${photos.length > 0 ? ` (${photos.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
