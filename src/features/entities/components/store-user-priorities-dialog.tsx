"use client";

import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { LoadingState } from "@/shared/components/loading-state";
import { useSetStoreUserPriorities, useStoreDetailV2 } from "../hooks";
import type { DetailedStore, ListableEntityLite } from "../schemas";
import {
  EntitySearchField,
  formatCustomerOption,
  formatCustomerSelected,
  formatProgramOption,
  formatProgramSelected,
  formatUserOption,
  formatUserSelected,
} from "./entity-search-field";

interface PriorityEntry {
  key: string;
  user: ListableEntityLite | null;
  customer: ListableEntityLite | null;
  program: ListableEntityLite | null;
}

function newEntry(
  user: ListableEntityLite | null = null,
  customer: ListableEntityLite | null = null,
  program: ListableEntityLite | null = null,
): PriorityEntry {
  return {
    key: `${Date.now()}-${Math.random()}`,
    user,
    customer,
    program,
  };
}

function entriesFromStore(store: DetailedStore): PriorityEntry[] {
  return store.user_priorities.map((priority) =>
    newEntry(
      priority.user as ListableEntityLite,
      (priority.customer as ListableEntityLite | null | undefined) ?? null,
      (priority.program as ListableEntityLite | null | undefined) ?? null,
    ),
  );
}

function PrioritiesForm({
  store,
  isSaving,
  onCancel,
  onApply,
}: {
  store: DetailedStore;
  isSaving: boolean;
  onCancel: () => void;
  onApply: (entries: PriorityEntry[]) => void;
}) {
  const [entries, setEntries] = useState(() => entriesFromStore(store));

  const move = (index: number, delta: number) => {
    setEntries((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      const [row] = copy.splice(index, 1);
      copy.splice(target, 0, row!);
      return copy;
    });
  };

  return (
    <>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        <h3 className="text-sm font-medium">Rep assignments</h3>
        {entries.length > 0 && (
          <div className="hidden gap-3 px-1 text-xs text-muted-foreground sm:grid sm:grid-cols-[1fr_1fr_1fr_auto]">
            <span>User</span>
            <span>Customer</span>
            <span>Program</span>
            <span className="w-36" />
          </div>
        )}

        {entries.length === 0 ? (
          <div className="flex items-center justify-between rounded-md border px-3 py-4 text-sm">
            <span className="text-muted-foreground">
              There are no reps currently assigned to this store.
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-label="Add rep"
              onClick={() => setEntries([newEntry()])}
            >
              <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry, index) => (
              <li
                key={entry.key}
                className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center"
              >
                <EntitySearchField
                  key={entry.user?.id ?? `user-${entry.key}`}
                  route="users"
                  value={entry.user}
                  onChange={(user) =>
                    setEntries((current) =>
                      current.map((row, i) => (i === index ? { ...row, user } : row)),
                    )
                  }
                  formatOption={formatUserOption}
                  formatSelected={formatUserSelected}
                  placeholder="User"
                  required
                  aria-label={`User for row ${index + 1}`}
                />
                <EntitySearchField
                  key={entry.customer?.id ?? `customer-${entry.key}`}
                  route="customers"
                  value={entry.customer}
                  onChange={(customer) =>
                    setEntries((current) =>
                      current.map((row, i) =>
                        i === index ? { ...row, customer, program: null } : row,
                      ),
                    )
                  }
                  formatOption={formatCustomerOption}
                  formatSelected={formatCustomerSelected}
                  placeholder="Customer (optional)"
                  aria-label={`Customer for row ${index + 1}`}
                />
                <EntitySearchField
                  key={`${entry.customer?.id ?? "any"}-${entry.program?.id ?? `program-${entry.key}`}`}
                  route="programs"
                  value={entry.program}
                  onChange={(program) =>
                    setEntries((current) =>
                      current.map((row, i) => (i === index ? { ...row, program } : row)),
                    )
                  }
                  formatOption={formatProgramOption}
                  formatSelected={formatProgramSelected}
                  placeholder="Program (optional)"
                  extraParams={
                    entry.customer ? { customer__id__in: entry.customer.id } : undefined
                  }
                  aria-label={`Program for row ${index + 1}`}
                />
                <div className="flex items-center gap-0.5">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={index === 0}
                    aria-label="Move up"
                    onClick={() => move(index, -1)}
                  >
                    <HugeiconsIcon icon={ArrowUp01Icon} aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    disabled={index >= entries.length - 1}
                    aria-label="Move down"
                    onClick={() => move(index, 1)}
                  >
                    <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Remove"
                    onClick={() =>
                      setEntries((current) => current.filter((_, i) => i !== index))
                    }
                  >
                    <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Add row below"
                    onClick={() =>
                      setEntries((current) => {
                        const next = [...current];
                        next.splice(index + 1, 0, newEntry());
                        return next;
                      })
                    }
                  >
                    <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={isSaving || entries.some((entry) => !entry.user)}
          onClick={() => onApply(entries)}
        >
          {isSaving ? "Saving…" : "Apply"}
        </Button>
      </DialogFooter>
    </>
  );
}

interface StoreUserPrioritiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: number | null;
  storeLabel: string;
  onSuccess?: () => void;
}

/**
 * Ordered rep assignments for a store (`set_user_priorities` replace-all).
 * Editor remounts via `key` when store detail arrives (avoids setState-in-effect).
 */
export function StoreUserPrioritiesDialog({
  open,
  onOpenChange,
  storeId,
  storeLabel,
  onSuccess,
}: StoreUserPrioritiesDialogProps) {
  const detailQuery = useStoreDetailV2(storeId, open && storeId !== null);
  const saveMutation = useSetStoreUserPriorities(storeId ?? 0);
  const ready = detailQuery.isSuccess && detailQuery.data != null && !detailQuery.isFetching;

  const apply = (entries: PriorityEntry[]) => {
    if (storeId === null) return;
    if (entries.some((entry) => !entry.user)) return;
    saveMutation.mutate(
      {
        entries: entries.map((entry) => ({
          user: entry.user!.id,
          customer: entry.customer?.id ?? null,
          program: entry.program?.id ?? null,
        })),
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Assign reps</DialogTitle>
          <DialogDescription>{storeLabel}</DialogDescription>
        </DialogHeader>

        {!ready || !detailQuery.data ? (
          <>
            <LoadingState label="Loading assignments…" />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled>
                Apply
              </Button>
            </DialogFooter>
          </>
        ) : (
          <PrioritiesForm
            key={`${storeId}-${detailQuery.dataUpdatedAt}`}
            store={detailQuery.data}
            isSaving={saveMutation.isPending}
            onCancel={() => onOpenChange(false)}
            onApply={apply}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
