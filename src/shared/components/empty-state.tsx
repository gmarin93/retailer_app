import type { ReactNode } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "@/shared/lib/utils";

/** Placeholder for screens or lists with nothing to show yet. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: IconSvgElement;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card p-12 text-center shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {icon && (
        <span
          aria-hidden="true"
          className="mb-3 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <HugeiconsIcon icon={icon} className="size-7" />
        </span>
      )}
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && (
        <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
