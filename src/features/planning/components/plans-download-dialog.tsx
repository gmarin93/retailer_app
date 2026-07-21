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
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { ListableCycle } from "@/shared/services/entities/cycles";
import { useActivePrograms } from "@/shared/services/entities/programs";
import { useDownloadPlansSummary } from "../hooks";
import { cn } from "@/shared/lib/utils";

interface CustomerOption {
  id: number;
  title: string;
}

interface PlansDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycles: ListableCycle[];
  customers: CustomerOption[];
  defaultCycleId: number | null;
  defaultCustomerId: number | null;
  defaultProgramId: number | null;
}

export function PlansDownloadDialog({
  open,
  onOpenChange,
  cycles,
  customers,
  defaultCycleId,
  defaultCustomerId,
  defaultProgramId,
}: PlansDownloadDialogProps) {
  const [cycleId, setCycleId] = useState<number | null>(defaultCycleId);
  const [customerId, setCustomerId] = useState<number | null>(defaultCustomerId);
  const [selectedProgramIds, setSelectedProgramIds] = useState<number[]>(
    defaultProgramId != null ? [defaultProgramId] : [],
  );
  const programs = useActivePrograms(customerId);
  const download = useDownloadPlansSummary();

  function toggleProgram(programId: number) {
    setSelectedProgramIds((current) =>
      current.includes(programId)
        ? current.filter((id) => id !== programId)
        : [...current, programId],
    );
  }

  function handleDownload() {
    if (cycleId == null || customerId == null) return;
    download.mutate(
      {
        cycleId,
        customerId,
        programIds: selectedProgramIds.length > 0 ? selectedProgramIds : undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Download plans summary</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cycle</Label>
            <Select
              value={cycleId === null ? "" : String(cycleId)}
              onValueChange={(value) => setCycleId(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Cycle" />
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
              value={customerId === null ? "" : String(customerId)}
              onValueChange={(value) => {
                setCustomerId(Number(value));
                setSelectedProgramIds([]);
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
            <Label>Programs (optional)</Label>
            <ul className="max-h-48 divide-y overflow-y-auto rounded-md border">
              {(programs.data ?? []).map((program) => {
                const checked = selectedProgramIds.includes(program.id);
                return (
                  <li key={program.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent/40",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={checked}
                        onChange={() => toggleProgram(program.id)}
                      />
                      {program.title}
                    </label>
                  </li>
                );
              })}
              {(programs.data ?? []).length === 0 && (
                <li className="px-3 py-3 text-sm text-muted-foreground">
                  {customerId == null
                    ? "Select a customer to list programs."
                    : "No active programs."}
                </li>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={cycleId == null || customerId == null || download.isPending}
            onClick={handleDownload}
          >
            {download.isPending ? "Downloading…" : "Download"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
