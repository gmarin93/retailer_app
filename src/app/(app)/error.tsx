"use client";

import { ErrorState } from "@/shared/components/error-state";

/** Route-level error boundary for the authenticated area. */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState error={error} onRetry={reset} className="min-h-[60vh]" />;
}
