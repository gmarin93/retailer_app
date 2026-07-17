"use client";

import { useState } from "react";
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
import { LoadingState } from "@/shared/components/loading-state";
import type { ListableCycle } from "@/shared/services/entities/cycles";
import { useActivePrograms } from "@/shared/services/entities/programs";
import type { DetailedPlan } from "../schemas";
import { usePlanStoreDiff } from "../hooks";
import type { CopyPlanOptions } from "../schemas";

interface CustomerOption {
  id: number;
  title: string;
}

interface PlannerCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: DetailedPlan;
  cycles: ListableCycle[];
  customers: CustomerOption[];
  defaultCycleId: number;
  defaultCustomerId: number | null;
  defaultProgramId: number;
  busy?: boolean;
  onCopy: (options: CopyPlanOptions) => void;
}

export function PlannerCopyDialog({
  open,
  onOpenChange,
  plan,
  cycles,
  customers,
  defaultCycleId,
  defaultCustomerId,
  defaultProgramId,
  busy = false,
  onCopy,
}: PlannerCopyDialogProps) {
  const [cycleId, setCycleId] = useState(defaultCycleId);
  const [customerId, setCustomerId] = useState<number | null>(defaultCustomerId);
  const [programId, setProgramId] = useState<number | null>(defaultProgramId);
  const [group, setGroup] = useState(`${plan.group} - Copy`);
  const [copyStores, setCopyStores] = useState(true);
  const [copyVisits, setCopyVisits] = useState(true);
  const [syncVisits, setSyncVisits] = useState(true);
  const [usePriorCycleStores, setUsePriorCycleStores] = useState(false);

  const programs = useActivePrograms(customerId);
  const storeDiff = usePlanStoreDiff(plan.id, cycleId);
  const targetCycle = cycles.find((cycle) => cycle.id === cycleId);

  function handleSubmit() {
    if (programId === null) return;
    onCopy({
      cycleId,
      programId,
      group: group.trim() || `${plan.group} - Copy`,
      copyStores,
      copyVisits,
      syncVisits,
      usePriorCycleStores,
      priorCycleStoreIds: (storeDiff.data?.prior_stores ?? []).map((store) => store.id),
      targetCycleStartsOn: targetCycle?.starts_on,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Copy plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Target cycle</Label>
            <Select
              value={String(cycleId)}
              onValueChange={(value) => {
                setCycleId(Number(value));
                setUsePriorCycleStores(false);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {cycles.map((cycle) => (
                  <SelectItem key={cycle.id} value={String(cycle.id)}>
                    {cycle.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select
              value={customerId === null ? undefined : String(customerId)}
              onValueChange={(value) => {
                setCustomerId(Number(value));
                setProgramId(null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={String(customer.id)}>
                    {customer.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Program</Label>
            <Select
              value={programId === null ? undefined : String(programId)}
              onValueChange={(value) => setProgramId(Number(value))}
              disabled={customerId === null}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Program" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {(programs.data ?? []).map((program) => (
                  <SelectItem key={program.id} value={String(program.id)}>
                    {program.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="copy-group">Group name</Label>
            <Input
              id="copy-group"
              value={group}
              onChange={(event) => setGroup(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={copyStores}
                onChange={(event) => setCopyStores(event.target.checked)}
              />
              Copy stores
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={copyVisits}
                onChange={(event) => setCopyVisits(event.target.checked)}
              />
              Copy visits
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={syncVisits}
                disabled={!copyVisits}
                onChange={(event) => setSyncVisits(event.target.checked)}
              />
              Sync visits with target cycle dates
            </label>
          </div>

          <div className="rounded-md border p-3 text-sm">
            <p className="mb-2 font-medium">Store diff vs prior cycle</p>
            {storeDiff.isLoading ? (
              <LoadingState label="Loading store diff…" className="p-2" />
            ) : storeDiff.data?.has_prior_plan ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Prior: {storeDiff.data.prior_cycle?.title ?? "—"} ·{" "}
                  {storeDiff.data.prior_stores.length} stores ·{" "}
                  {storeDiff.data.added_stores.length} added ·{" "}
                  {storeDiff.data.removed_stores.length} removed
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={usePriorCycleStores}
                    disabled={storeDiff.data.prior_stores.length === 0}
                    onChange={(event) => setUsePriorCycleStores(event.target.checked)}
                  />
                  Use prior cycle store list
                </label>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No prior-cycle plan found for this program.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || !programId || !group.trim()}
            onClick={handleSubmit}
          >
            {busy ? "Copying…" : "Copy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
