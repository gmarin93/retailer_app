"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/features/auth/hooks";
import {
  canDownloadJobPhotos,
  isElevated,
  isElevatedOrManager,
  isElevatedOrManagerOrSupervisor,
} from "@/features/auth/permissions";
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
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  downloadJobsReportBlob,
  emailJobsReport,
  type JobsQuery,
  type JobsView,
} from "../api";
import { downloadPhotosZip } from "../download";

type Scope = "filter" | "selection";

interface JobsDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: JobsView;
  filterQuery: Omit<JobsQuery, "page" | "pageSize" | "order">;
  selectedIds: number[];
  defaultScope?: Scope;
}

const EMAIL_REPORTS: {
  id: string;
  label: string;
  path: string;
  gate: (role: UserRole) => boolean;
}[] = [
  {
    id: "legacy_cms",
    label: "Legacy CMS (XLS)",
    path: "legacy_cms_report",
    gate: (r) => isElevated(r) || isElevatedOrManager(r),
  },
  {
    id: "legacy_website",
    label: "Legacy website (XLS)",
    path: "legacy_website_report",
    gate: (r) => isElevated(r) || isElevatedOrManager(r),
  },
  {
    id: "fill_rate",
    label: "Fill rate",
    path: "fill_rate_report",
    gate: (r) => isElevatedOrManager(r),
  },
  {
    id: "rep_distro",
    label: "Rep distribution",
    path: "rep_distro_report",
    gate: (r) => isElevatedOrManagerOrSupervisor(r),
  },
  {
    id: "invoicing_summary",
    label: "Invoicing summary",
    path: "invoicing_summary_report",
    gate: (r) => isElevated(r),
  },
];

/**
 * Download dialog: photo ZIP (client) + emailed/blob server reports.
 * Angular used jspdf only via package.json — jobs reports are server blobs/email.
 */
export function JobsDownloadDialog({
  open,
  onOpenChange,
  view,
  filterQuery,
  selectedIds,
  defaultScope = "filter",
}: JobsDownloadDialogProps) {
  const session = useSession();
  const role = session?.user.role ?? UserRole.FIELD_REP;
  const [scope, setScope] = useState<Scope>(defaultScope);
  const [report, setReport] = useState("photos_zip");
  const [email, setEmail] = useState(session?.user.email ?? "");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  const scopedQuery =
    scope === "selection" && selectedIds.length > 0
      ? { ...filterQuery, view, ids: selectedIds }
      : { ...filterQuery, view };

  const run = async () => {
    setBusy(true);
    setProgress("");
    try {
      if (report === "photos_zip") {
        if (!canDownloadJobPhotos(role)) {
          toast.error("You don't have permission to download photos");
          return;
        }
        const count = await downloadPhotosZip(scopedQuery, setProgress);
        if (count === 0) toast.message("No photos found for this scope");
        else toast.success(`Downloaded ${count} photo(s)`);
        onOpenChange(false);
        return;
      }
      if (report === "rep_summary" || report === "rep_details") {
        const path = report === "rep_summary" ? "rep_summary_report" : "rep_details_report";
        const blob = await downloadJobsReportBlob(view, path, scopedQuery);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${report}_${Date.now()}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Report downloaded");
        onOpenChange(false);
        return;
      }
      const meta = EMAIL_REPORTS.find((r) => r.id === report);
      if (!meta) return;
      if (!email.trim()) {
        toast.error("Enter an email address");
        return;
      }
      await emailJobsReport(view, meta.path, email.trim(), scopedQuery);
      toast.success(`Report queued for ${email.trim()}`);
      onOpenChange(false);
    } catch {
      toast.error("Download failed");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download</DialogTitle>
          <DialogDescription>
            Export photos or request a server-generated report for the current filter
            {selectedIds.length > 0 ? " or selection" : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {selectedIds.length > 0 && (
            <div className="space-y-1.5">
              <Label>Scope</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="filter">Current filters</SelectItem>
                  <SelectItem value="selection">
                    Selected ({selectedIds.length})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Report</Label>
            <Select value={report} onValueChange={setReport}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {canDownloadJobPhotos(role) && (
                  <SelectItem value="photos_zip">Photos (ZIP)</SelectItem>
                )}
                <SelectItem value="rep_summary">Rep — visit summary</SelectItem>
                <SelectItem value="rep_details">Rep — photos/questions</SelectItem>
                {EMAIL_REPORTS.filter((r) => r.gate(role)).map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {EMAIL_REPORTS.some((r) => r.id === report) && (
            <div className="space-y-1.5">
              <Label htmlFor="dl-email">Email</Label>
              <Input
                id="dl-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}
          {progress && <p className="text-xs text-muted-foreground">{progress}</p>}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={() => void run()}>
            {busy ? "Working…" : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
