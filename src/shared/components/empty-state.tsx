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
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-white p-12 text-center shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {icon && (
        <HugeiconsIcon
          icon={icon}
          aria-hidden="true"
          className="mb-2 size-10 text-muted-foreground"
        />
      )}
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && (
        <p className="max-w-md text-[13px] text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
