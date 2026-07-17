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
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-[#ffe9e6] bg-[#fff7f6] p-12 text-center shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <HugeiconsIcon
        icon={Alert02Icon}
        aria-hidden="true"
        className="mb-2 size-10 text-destructive"
      />
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="max-w-md text-[13px] text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
