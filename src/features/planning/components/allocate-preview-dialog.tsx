"use client";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { cn } from "@/shared/lib/utils";
import type { AllocatePreview } from "../schemas";
import { toDateInputValue } from "../utils";

interface AllocatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: string;
  preview: AllocatePreview | null;
  canAllocate: boolean;
  allocating?: boolean;
  onAllocate: () => void;
}

function formatVisitWindow(visit: AllocatePreview["jobs"][number]["visit"]): string {
  const opens = toDateInputValue(visit.opens_at ?? undefined);
  const closes = toDateInputValue(visit.closes_at ?? undefined);
  if (!opens && !closes) return "—";
  return `${opens || "?"} → ${closes || "?"}`;
}

function formatAssignee(
  assignee: AllocatePreview["jobs"][number]["assignee"],
): string {
  if (!assignee) return "Unassigned";
  const rep = assignee.rep_no != null ? `#${assignee.rep_no} ` : "";
  return `${rep}${assignee.name}`.trim();
}

export function AllocatePreviewDialog({
  open,
  onOpenChange,
  group,
  preview,
  canAllocate,
  allocating = false,
  onAllocate,
}: AllocatePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Dispatch preview</DialogTitle>
        </DialogHeader>

        {!preview ? (
          <p className="text-sm text-muted-foreground">Building preview…</p>
        ) : (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            <p className="text-sm text-muted-foreground">
              Preview for <span className="font-medium text-foreground">Group {group}</span>{" "}
              — no jobs have been created yet.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total jobs", value: preview.count_jobs },
                { label: "Assigned", value: preview.assigned_jobs },
                {
                  label: "Unassigned",
                  value: preview.unassigned_jobs,
                  danger: preview.unassigned_jobs > 0,
                },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p
                    className={cn(
                      "text-lg font-semibold",
                      kpi.danger && "text-red-600",
                    )}
                  >
                    {kpi.value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {preview.rep_workload.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Rep workload</h3>
                <ul className="divide-y rounded-md border">
                  {preview.rep_workload.map((rep) => (
                    <li
                      key={rep.user_id}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                    >
                      <span>
                        {rep.rep_no != null && (
                          <span className="mr-1 text-muted-foreground">#{rep.rep_no}</span>
                        )}
                        {rep.name}
                      </span>
                      <span className="text-muted-foreground">
                        {rep.jobs.toLocaleString()} jobs
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="space-y-2">
              <h3 className="text-sm font-medium">Job matrix</h3>
              {preview.truncated && (
                <p className="text-xs text-amber-700">
                  Showing the first {preview.preview_limit.toLocaleString()} of{" "}
                  {preview.count_jobs.toLocaleString()} jobs.
                </p>
              )}
              <div className="max-h-72 overflow-auto rounded-md border">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-background">
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Store</th>
                      <th className="px-3 py-2 font-medium">Visit</th>
                      <th className="px-3 py-2 font-medium">Rep</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.jobs.map((job, index) => (
                      <tr key={`${job.store.id}-${job.visit.id}-${index}`} className="border-b">
                        <td className="px-3 py-2">
                          <span className="block text-xs text-muted-foreground">
                            {job.store.retailer}
                          </span>
                          #{job.store.store_no} — {job.store.title}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {formatVisitWindow(job.visit)}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2",
                            !job.assignee && "font-medium text-red-600",
                          )}
                        >
                          {formatAssignee(job.assignee)}
                        </td>
                      </tr>
                    ))}
                    {preview.jobs.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-muted-foreground">
                          No jobs in this preview.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canAllocate && (
            <Button type="button" disabled={!preview || allocating} onClick={onAllocate}>
              {allocating ? "Allocating…" : "Allocate now"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
