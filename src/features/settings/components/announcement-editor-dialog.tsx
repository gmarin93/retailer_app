"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Megaphone01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { USER_ROLE_LABELS } from "@/features/auth/types";
import { useCreateAnnouncement, useUpdateAnnouncement } from "../hooks";
import type { Announcement, AnnouncementStatus } from "../schemas";
import { ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_PRIORITIES } from "../schemas";

const schema = z.object({
  title: z.string().min(1, "Title is required.").max(200),
  summary: z.string().max(300),
  body: z.string(),
  category: z.string(),
  priority: z.enum(["critical", "high", "normal", "low"]),
  publishAt: z.string(),
  expiresAt: z.string(),
  targetRoles: z.array(z.string()),
});
type FormValues = z.infer<typeof schema>;

/** Converts ISO string to `datetime-local` input format (local time). */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

const ROLE_OPTIONS = Object.entries(USER_ROLE_LABELS).map(([value, label]) => ({ value, label }));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing an existing announcement. */
  announcement?: Announcement | null;
  onSaved: () => void;
}

export function AnnouncementEditorDialog({ open, onOpenChange, announcement, onSaved }: Props) {
  const isEditing = announcement != null;
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      summary: "",
      body: "",
      category: "general",
      priority: "normal",
      publishAt: "",
      expiresAt: "",
      targetRoles: [],
    },
  });

  useEffect(() => {
    if (!open) return;
    if (announcement) {
      reset({
        title: announcement.title,
        summary: announcement.summary,
        body: announcement.body,
        category: announcement.category,
        priority: announcement.priority,
        publishAt: toLocalInput(announcement.publish_at),
        expiresAt: toLocalInput(announcement.expires_at),
        targetRoles: announcement.target_roles ?? [],
      });
    } else {
      reset({
        title: "",
        summary: "",
        body: "",
        category: "general",
        priority: "normal",
        publishAt: "",
        expiresAt: "",
        targetRoles: [],
      });
    }
  }, [open, announcement, reset]);

  const previewTitle = useWatch({ control, name: "title" }) || "Announcement title";
  const previewSummary =
    useWatch({ control, name: "summary" }) || "Short summary shown on the dashboard card…";
  const previewPriority = useWatch({ control, name: "priority" });

  const save = (status: AnnouncementStatus) =>
    handleSubmit((values: FormValues) => {
      const payload = {
        title: values.title.trim(),
        summary: values.summary.trim(),
        body: values.body.trim(),
        category: values.category,
        priority: values.priority,
        status,
        publish_at: values.publishAt ? new Date(values.publishAt).toISOString() : new Date().toISOString(),
        expires_at: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
        target_roles: values.targetRoles,
      };
      if (isEditing) {
        updateMutation.mutate(
          { id: announcement!.id, payload },
          { onSuccess: () => { onSaved(); onOpenChange(false); } },
        );
      } else {
        createMutation.mutate(payload, {
          onSuccess: () => { onSaved(); onOpenChange(false); },
        });
      }
    })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HugeiconsIcon icon={Megaphone01Icon} className="size-5" />
            </div>
            <div>
              <DialogTitle>{isEditing ? "Edit Announcement" : "New Announcement"}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                Mobile users see published announcements on their dashboard.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Live mobile preview */}
        <div
          className={`flex items-start gap-3 rounded-lg border p-3 ${
            previewPriority === "critical"
              ? "border-red-400 bg-red-50"
              : previewPriority === "high"
                ? "border-orange-400 bg-orange-50"
                : "border-border bg-muted/40"
          }`}
        >
          <HugeiconsIcon
            icon={Megaphone01Icon}
            className={`mt-0.5 size-5 shrink-0 ${
              previewPriority === "critical"
                ? "text-red-600"
                : previewPriority === "high"
                  ? "text-orange-600"
                  : "text-muted-foreground"
            }`}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{previewTitle}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{previewSummary}</p>
          </div>
          <p className="text-xs text-muted-foreground shrink-0">Preview</p>
        </div>

        <form className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">Title</Label>
            <Input id="ann-title" maxLength={200} {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ann-summary">Short summary (dashboard card)</Label>
            <Input id="ann-summary" maxLength={300} {...register("summary")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ann-body">Full content</Label>
            <textarea
              id="ann-body"
              rows={5}
              placeholder="The full message users read when they open the announcement."
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("body")}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANNOUNCEMENT_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ANNOUNCEMENT_PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Audience (roles — empty means everyone)</Label>
            <Controller
              name="targetRoles"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-2 rounded-md border p-3">
                  {ROLE_OPTIONS.map((role) => (
                    <label key={role.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.value.includes(role.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            field.onChange([...field.value, role.value]);
                          } else {
                            field.onChange(field.value.filter((r: string) => r !== role.value));
                          }
                        }}
                        className="size-3.5"
                      />
                      {role.label}
                    </label>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ann-publish-at">Publish at (empty = now)</Label>
              <Input id="ann-publish-at" type="datetime-local" {...register("publishAt")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-expires-at">Expires at (empty = never)</Label>
              <Input id="ann-expires-at" type="datetime-local" {...register("expiresAt")} />
            </div>
          </div>
        </form>

        <div className="flex items-center gap-2 border-t pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => save("draft")} disabled={isPending}>
            Save Draft
          </Button>
          <Button onClick={() => save("published")} disabled={isPending}>
            {isPending ? "Saving…" : isEditing ? "Save & Publish" : "Publish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
