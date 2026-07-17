"use client";

import { format } from "date-fns";
import {
  Archive02Icon,
  Delete02Icon,
  Edit02Icon,
  Megaphone01Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { cn } from "@/shared/lib/utils";
import {
  useAnnouncements,
  useDeleteAnnouncement,
  usePatchAnnouncementStatus,
} from "../hooks";
import type { Announcement, AnnouncementEffectiveStatus } from "../schemas";
import {
  ANNOUNCEMENT_CATEGORIES,
  STATUS_FILTERS,
} from "../schemas";
import { AnnouncementEditorDialog } from "./announcement-editor-dialog";

function categoryLabel(value: string) {
  return ANNOUNCEMENT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

const STATUS_CHIP_CLASS: Record<AnnouncementEffectiveStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-green-100 text-green-700",
  archived: "bg-slate-100 text-slate-600",
  expired: "bg-amber-100 text-amber-700",
};

const PRIORITY_DOT_CLASS: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-400",
  normal: "bg-muted-foreground",
  low: "bg-muted-foreground/40",
};

export function AnnouncementsCard() {
  const [statusFilter, setStatusFilter] = useState("");
  const [editTarget, setEditTarget] = useState<Announcement | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const query = useAnnouncements(statusFilter);
  const patchStatus = usePatchAnnouncementStatus();
  const deleteMutation = useDeleteAnnouncement();

  const announcements = query.data ?? [];

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={Megaphone01Icon} className="size-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">Announcements</div>
          <div className="text-xs text-muted-foreground">
            Publish communications to mobile users — new features, maintenance windows, safety
            notices, and more.
          </div>
        </div>
        <Button size="sm" onClick={() => setEditTarget(null)}>
          <HugeiconsIcon icon={Megaphone01Icon} aria-hidden className="size-4" />
          New Announcement
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1.5 py-3 border-b">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="pt-3">
        {query.isLoading ? (
          <LoadingState label="Loading announcements…" className="min-h-40" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
            <HugeiconsIcon icon={Megaphone01Icon} className="size-10 opacity-30" />
            <p className="text-sm font-medium">No announcements yet</p>
            <p className="text-xs">Create your first announcement to reach mobile users instantly.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Priority</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Publish</th>
                  <th className="pb-2 font-medium">Updated by</th>
                  <th className="pb-2 w-24" />
                </tr>
              </thead>
              <tbody>
                {announcements.map((ann) => (
                  <tr key={ann.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium leading-tight">{ann.title}</p>
                      {ann.summary && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{ann.summary}</p>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">{categoryLabel(ann.category)}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            PRIORITY_DOT_CLASS[ann.priority] ?? "bg-muted-foreground",
                          )}
                        />
                        <span className="text-xs capitalize">{ann.priority}</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          STATUS_CHIP_CLASS[ann.effective_status],
                        )}
                      >
                        {ann.effective_status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      {ann.publish_at
                        ? format(new Date(ann.publish_at), "MMM d, yyyy HH:mm")
                        : "—"}
                      {ann.expires_at && (
                        <div className="text-muted-foreground">
                          expires {format(new Date(ann.expires_at), "MMM d, yyyy HH:mm")}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                      {ann.updated_by || ann.created_by}
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => setEditTarget(ann)}
                          className="rounded p-1 hover:bg-muted"
                        >
                          <HugeiconsIcon icon={Edit02Icon} className="size-4" />
                        </button>
                        {ann.status !== "published" ? (
                          <button
                            type="button"
                            title="Publish"
                            disabled={patchStatus.isPending}
                            onClick={() =>
                              patchStatus.mutate({ announcement: ann, status: "published" })
                            }
                            className="rounded p-1 hover:bg-muted text-green-600"
                          >
                            <HugeiconsIcon icon={Upload01Icon} className="size-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            title="Archive (hide from mobile)"
                            disabled={patchStatus.isPending}
                            onClick={() =>
                              patchStatus.mutate({ announcement: ann, status: "archived" })
                            }
                            className="rounded p-1 hover:bg-muted text-muted-foreground"
                          >
                            <HugeiconsIcon icon={Archive02Icon} className="size-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => setDeleteTarget(ann)}
                          className="rounded p-1 hover:bg-muted text-destructive"
                        >
                          <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit dialog — editTarget === undefined = closed; null = create; Announcement = edit */}
      <AnnouncementEditorDialog
        open={editTarget !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditTarget(undefined);
        }}
        announcement={editTarget}
        onSaved={() => setEditTarget(undefined)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete announcement"
        question={`Permanently delete "${deleteTarget?.title}"? Mobile users will no longer see it and this cannot be undone.`}
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
