"use client";

import { Cancel01Icon, ImageAdd01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { cn } from "@/shared/lib/utils";

interface PhotoSlot {
  file: File;
  previewSrc: string;
}

const MAX_PHOTOS = 3;

/**
 * Photo picker dialog: up to three photos via file input or drag-and-drop,
 * with previews. Resolves with the selected files (Angular
 * `PhotoUploadDialogComponent` twin).
 */
export function PhotoUploadDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (files: File[]) => void;
}) {
  const [photos, setPhotos] = useState<PhotoSlot[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canAddMore = photos.length < MAX_PHOTOS;

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
          onClick={() => canAddMore && inputRef.current?.click()}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === " ") && canAddMore) {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            if (canAddMore) queueFiles(event.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-sm text-muted-foreground transition-colors",
            isDragging && "border-primary bg-primary/5",
            !canAddMore && "cursor-not-allowed opacity-50",
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
                  onClick={() =>
                    setPhotos((current) => {
                      URL.revokeObjectURL(photo.previewSrc);
                      return current.filter((_, i) => i !== index);
                    })
                  }
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-background p-0.5 shadow"
                >
                  <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            disabled={photos.length === 0}
            onClick={() => {
              onSubmit(photos.map((photo) => photo.file));
              setPhotos([]);
              onOpenChange(false);
            }}
          >
            Upload {photos.length > 0 ? `(${photos.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
