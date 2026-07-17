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

export interface SearchDialogResult {
  batchIds: string[];
  billingDate: string; // YYYY-MM-DD or ""
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (result: SearchDialogResult) => void;
}

export function UserInvoicingSearchDialog({ open, onOpenChange, onSearch }: Props) {
  const [batchIdsText, setBatchIdsText] = useState("");
  const [billingDate, setBillingDate] = useState("");

  const canSearch = batchIdsText.trim().length > 0 || billingDate.length > 0;

  const handleSearch = () => {
    if (!canSearch) return;
    const batchIds = batchIdsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onSearch({ batchIds, billingDate });
    onOpenChange(false);
    setBatchIdsText("");
    setBillingDate("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Search User Invoices</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="batch-ids">Batch IDs (comma-separated)</Label>
            <Input
              id="batch-ids"
              placeholder="e.g. 20240101-120000, 20240102-090000"
              value={batchIdsText}
              onChange={(e) => setBatchIdsText(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="search-billing-date">Billing date</Label>
            <Input
              id="search-billing-date"
              type="date"
              value={billingDate}
              onChange={(e) => setBillingDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSearch} disabled={!canSearch}>
            Search
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
