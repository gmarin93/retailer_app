"use client";

import { format } from "date-fns";
import { useMemo, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { useCustomersByTitle } from "@/shared/services/entities/customers";
import { useAllReps } from "@/features/jobs/hooks";
import type { ListableUser } from "../schemas";

export interface RunDialogResult {
  batchId: string;
  billingDate: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  customerId: number;
  users: ListableUser[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRun: (result: RunDialogResult) => void;
}

const todayISO = () => format(new Date(), "yyyy-MM-dd");
const defaultBatchId = () => format(new Date(), "yyyyMMdd-HHmmss");

export function UserInvoicingRunDialog({ open, onOpenChange, onRun }: Props) {
  const [batchId, setBatchId] = useState(defaultBatchId);
  const [billingDate, setBillingDate] = useState(todayISO);
  const [periodEnd, setPeriodEnd] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [doAllReps, setDoAllReps] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const customers = useCustomersByTitle();
  const repsQuery = useAllReps(open);
  const repsLoading = repsQuery.isLoading;
  const allReps = useMemo<ListableUser[]>(
    () =>
      (repsQuery.data ?? []).map((r) => {
        const raw = r as Record<string, unknown>;
        return {
          id: r.id,
          username: typeof raw.username === "string" ? raw.username : "",
          first_name: r.first_name ?? "",
          last_name: r.last_name ?? "",
          rep_no: typeof r.rep_no === "number" ? r.rep_no : null,
        };
      }),
    [repsQuery.data],
  );

  // Regenerate the batch id each time the dialog opens (render-phase state
  // adjustment; see react.dev "adjusting state when props change").
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setBatchId(defaultBatchId());
  }

  const activeUsers = doAllReps ? allReps : allReps.filter((u) => selectedUserIds.includes(u.id));
  const canRun =
    batchId.trim() &&
    billingDate &&
    periodEnd &&
    customerId &&
    activeUsers.length > 0;

  const repLabel = (u: ListableUser) => {
    const id = u.rep_no ? `REP${u.rep_no}` : `@${u.username}`;
    return `${u.first_name} ${u.last_name} (${id})`;
  };

  const handleRun = () => {
    if (!canRun) return;
    onRun({
      batchId: batchId.trim(),
      billingDate,
      periodEnd,
      customerId: Number(customerId),
      users: activeUsers,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Run User Invoicing</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="batch-id">Batch ID</Label>
            <Input id="batch-id" value={batchId} onChange={(e) => setBatchId(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="billing-date">Billing date</Label>
              <Input
                id="billing-date"
                type="date"
                value={billingDate}
                onChange={(e) => setBillingDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period-end">Period end</Label>
              <Input
                id="period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Customer to invoice</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer…" />
              </SelectTrigger>
              <SelectContent>
                {(customers.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={doAllReps}
                onChange={(e) => setDoAllReps(e.target.checked)}
                className="size-4"
              />
              Invoice all reps{repsLoading ? " (loading…)" : ` (${allReps.length})`}
            </label>

            {!doAllReps && (
              <div className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
                {allReps.map((rep) => (
                  <label key={rep.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(rep.id)}
                      onChange={(e) =>
                        setSelectedUserIds((prev) =>
                          e.target.checked ? [...prev, rep.id] : prev.filter((id) => id !== rep.id),
                        )
                      }
                      className="size-3.5"
                    />
                    {repLabel(rep)}
                  </label>
                ))}
              </div>
            )}

            {activeUsers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {activeUsers.length} rep{activeUsers.length === 1 ? "" : "s"} will be invoiced.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRun} disabled={!canRun}>
            Run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
