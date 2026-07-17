"use client";

import { Cancel01Icon, ImageAdd01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { ApiError } from "@/shared/services/api";
import { uploadEntityAvatar } from "../extras-api";
import type { BulkLogoEntityKind, ListableEntityLite } from "../schemas";
import {
  EntitySearchField,
  formatCustomerOption,
  formatCustomerSelected,
  formatRetailerOption,
  formatRetailerSelected,
  formatStoreOption,
  formatStoreSelected,
} from "./entity-search-field";

const MAX_PHOTOS = 100;
const CONCURRENCY = 3;

type RowStatus = "pending" | "queued" | "uploading" | "success" | "error";

interface UploadRow {
  id: string;
  file: File;
  previewUrl: string;
  entity: ListableEntityLite | null;
  status: RowStatus;
  errorMessage?: string;
}

const KIND_COPY: Record<
  BulkLogoEntityKind,
  { title: string; field: string; plural: string; route: "stores" | "customers" | "retailers" }
> = {
  store: {
    title: "Update store logos",
    field: "Store",
    plural: "stores",
    route: "stores",
  },
  customer: {
    title: "Update customer logos",
    field: "Customer",
    plural: "customers",
    route: "customers",
  },
  retailer: {
    title: "Update retailer logos",
    field: "Retailer",
    plural: "retailers",
    route: "retailers",
  },
};

function formatters(kind: BulkLogoEntityKind) {
  if (kind === "store") {
    return { option: formatStoreOption, selected: formatStoreSelected };
  }
  if (kind === "customer") {
    return { option: formatCustomerOption, selected: formatCustomerSelected };
  }
  return { option: formatRetailerOption, selected: formatRetailerSelected };
}

async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  async function next(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index]!);
    }
  }
  const workers = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workers }, () => next()));
}

interface BulkLogoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityKind: BulkLogoEntityKind;
  onSuccess?: () => void;
}

/**
 * Bulk logo upload with manual entity pairing + concurrency-3 pool
 * (Angular `BulkLogoUploadDialogComponent` twin).
 */
export function BulkLogoUploadDialog({
  open,
  onOpenChange,
  entityKind,
  onSuccess,
}: BulkLogoUploadDialogProps) {
  const copy = KIND_COPY[entityKind];
  const { option, selected } = formatters(entityKind);
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const anySucceededRef = useRef(false);

  const readyCount = rows.filter((row) => row.entity && row.status === "pending").length;
  const successCount = rows.filter((row) => row.status === "success").length;
  const errorCount = rows.filter((row) => row.status === "error").length;

  const reset = () => {
    for (const row of rows) URL.revokeObjectURL(row.previewUrl);
    setRows([]);
    anySucceededRef.current = false;
  };

  const close = (nextOpen: boolean) => {
    if (uploading) return;
    if (!nextOpen) {
      const succeeded = anySucceededRef.current;
      reset();
      onOpenChange(false);
      if (succeeded) onSuccess?.();
      return;
    }
    onOpenChange(nextOpen);
  };

  const addFiles = (files: FileList | File[]) => {
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    setRows((current) => {
      const room = MAX_PHOTOS - current.length;
      const next = images.slice(0, room).map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        entity: null,
        status: "pending" as const,
      }));
      return [...current, ...next];
    });
  };

  const removeRow = (id: string) => {
    setRows((current) => {
      const row = current.find((item) => item.id === id);
      if (!row || row.status === "uploading") return current;
      URL.revokeObjectURL(row.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  };

  const setEntity = (id: string, entity: ListableEntityLite | null) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        return {
          ...row,
          entity,
          status: row.status === "error" ? "pending" : row.status,
          errorMessage: row.status === "error" ? undefined : row.errorMessage,
        };
      }),
    );
  };

  const startUpload = async () => {
    if (uploading) return;
    const queue = rows.filter(
      (row) => row.entity && (row.status === "pending" || row.status === "error"),
    );
    if (queue.length === 0) return;

    setUploading(true);
    setRows((current) =>
      current.map((row) =>
        queue.some((item) => item.id === row.id)
          ? { ...row, status: "queued", errorMessage: undefined }
          : row,
      ),
    );

    let succeeded = 0;
    let failed = 0;

    await runPool(queue, CONCURRENCY, async (queued) => {
      setRows((current) =>
        current.map((row) =>
          row.id === queued.id ? { ...row, status: "uploading" } : row,
        ),
      );
      try {
        await uploadEntityAvatar(entityKind, queued.entity!.id, queued.file);
        anySucceededRef.current = true;
        succeeded += 1;
        setRows((current) =>
          current.map((row) =>
            row.id === queued.id ? { ...row, status: "success" } : row,
          ),
        );
      } catch (error) {
        failed += 1;
        const message =
          error instanceof ApiError ? error.message : "Upload failed";
        setRows((current) =>
          current.map((row) =>
            row.id === queued.id
              ? { ...row, status: "error", errorMessage: message }
              : row,
          ),
        );
      }
    });

    setUploading(false);
    if (succeeded > 0 && failed === 0) {
      toast.success(`${succeeded} ${copy.plural} updated.`);
    } else if (failed > 0) {
      toast.error(`${failed} of ${succeeded + failed} uploads failed.`);
    }
  };

  useEffect(() => {
    if (!open) return;
    anySucceededRef.current = false;
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            Pair each image with a {copy.field.toLowerCase()}, then start upload (up to{" "}
            {MAX_PHOTOS} images, {CONCURRENCY} at a time).
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading || rows.length >= MAX_PHOTOS}
              onClick={() => inputRef.current?.click()}
            >
              <HugeiconsIcon icon={ImageAdd01Icon} aria-hidden="true" className="size-4" />
              Add images
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <span className="text-xs text-muted-foreground">
              {rows.length} selected · {readyCount} ready
              {successCount > 0 ? ` · ${successCount} done` : ""}
              {errorCount > 0 ? ` · ${errorCount} failed` : ""}
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No images yet. Add logos to begin.
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border p-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={row.previewUrl}
                    alt=""
                    className="size-12 rounded object-cover"
                  />
                  <div className="min-w-40 flex-1 space-y-1">
                    <p className="truncate text-xs text-muted-foreground">{row.file.name}</p>
                    <EntitySearchField
                      key={row.entity?.id ?? `entity-${row.id}`}
                      route={copy.route}
                      value={row.entity}
                      onChange={(entity) => setEntity(row.id, entity)}
                      formatOption={option}
                      formatSelected={selected}
                      placeholder={`Pick a ${copy.field.toLowerCase()}`}
                      disabled={uploading || row.status === "success"}
                      aria-label={`${copy.field} for ${row.file.name}`}
                    />
                  </div>
                  <span className="w-24 text-xs text-muted-foreground">
                    {row.status === "pending" && (row.entity ? "Ready" : "Pick entity")}
                    {row.status === "queued" && "Queued"}
                    {row.status === "uploading" && "Uploading…"}
                    {row.status === "success" && "Uploaded"}
                    {row.status === "error" && (row.errorMessage || "Failed")}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={uploading || row.status === "uploading"}
                    aria-label="Remove row"
                    onClick={() => removeRow(row.id)}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          {!uploading && (
            <Button type="button" variant="ghost" onClick={() => close(false)}>
              {successCount > 0 ? "Done" : "Cancel"}
            </Button>
          )}
          <Button
            type="button"
            disabled={!readyCount || uploading}
            onClick={() => void startUpload()}
          >
            {uploading ? "Uploading…" : "Start upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
