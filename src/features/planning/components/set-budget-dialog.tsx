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
import type { ListableCycle } from "@/shared/services/entities/cycles";
import { useReviewableCustomersByTitle } from "@/shared/services/entities/customers";
import { useSetCustomerCycleBudget } from "../hooks";

interface SetBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycles: ListableCycle[];
  defaultCycleId: number | null;
  defaultCustomerId: number | null;
  onSaved?: () => void;
}

export function SetBudgetDialog({
  open,
  onOpenChange,
  cycles,
  defaultCycleId,
  defaultCustomerId,
  onSaved,
}: SetBudgetDialogProps) {
  const customers = useReviewableCustomersByTitle(open);
  const [cycleId, setCycleId] = useState<number | null>(defaultCycleId);
  const [customerId, setCustomerId] = useState<number | null>(defaultCustomerId);
  const [budget, setBudget] = useState("");
  const mutation = useSetCustomerCycleBudget();

  function handleSubmit() {
    if (customerId == null || cycleId == null) return;
    const value = Number(budget);
    if (!Number.isFinite(value) || value <= 0) return;
    mutation.mutate(
      { customerId, cycleId, budget: value },
      {
        onSuccess: () => {
          onOpenChange(false);
          setBudget("");
          onSaved?.();
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Set cycle budget</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select
              value={customerId === null ? "" : String(customerId)}
              onValueChange={(value) => setCustomerId(Number(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {(customers.data ?? []).map((customer) => (
                  <SelectItem key={customer.id} value={String(customer.id)}>
                    {customer.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <Label htmlFor="cycle-budget">Budget</Label>
            <Input
              id="cycle-budget"
              type="number"
              min={0}
              step="0.01"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            disabled={
              customerId == null ||
              cycleId == null ||
              !(Number(budget) > 0) ||
              mutation.isPending
            }
            onClick={handleSubmit}
          >
            {mutation.isPending ? "Saving…" : "Save budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
