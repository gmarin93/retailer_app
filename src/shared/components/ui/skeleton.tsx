import { cn } from "@/shared/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        // Shimmer sweep over the base surface (`skeleton-shimmer` keyframes in
        // globals.css); stilled by the global prefers-reduced-motion rule.
        "after:absolute after:inset-0 after:animate-[skeleton-shimmer_1.6s_ease-in-out_infinite] after:bg-gradient-to-r after:from-transparent after:via-foreground/6 after:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
