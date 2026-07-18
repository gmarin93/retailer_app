"use client";

import { Alert02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/shared/components/ui/button";
import { ApiError } from "@/shared/services/api";
import { cn } from "@/shared/lib/utils";

/** Standard failure panel for queries; shows a retry button when provided. */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const message =
    error instanceof ApiError ? error.message : "Something went wrong. Please try again.";

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--error-border)] bg-[var(--error-surface)] p-12 text-center shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="mb-3 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive"
      >
        <HugeiconsIcon icon={Alert02Icon} className="size-7" />
      </span>
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
