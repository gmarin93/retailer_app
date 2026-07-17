import { cn } from "@/shared/lib/utils";

/** Centered spinner with an accessible status label. */
export function LoadingState({
  label = "Loading…",
  fullScreen = false,
  className,
}: {
  label?: string;
  fullScreen?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-8",
        fullScreen && "min-h-dvh",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
      />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
