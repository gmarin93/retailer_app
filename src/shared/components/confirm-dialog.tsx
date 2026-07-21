"use client";

import type { ReactNode } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

/** Yes/no confirmation dialog (the Angular `ChoiceDialogComponent` twin). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  question,
  confirmLabel = "Yes",
  cancelLabel = "Cancel",
  destructive = false,
  isPending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  question: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /**
   * When provided (including `false`), the dialog stays open after confirm so
   * the parent can close on mutation success. Omit to keep the legacy
   * close-immediately behavior.
   */
  isPending?: boolean;
  onConfirm: () => void;
}) {
  const managesPending = isPending !== undefined;
  const pending = isPending ?? false;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && pending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{question}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" disabled={pending} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            aria-busy={pending}
            onClick={() => {
              onConfirm();
              if (!managesPending) onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
