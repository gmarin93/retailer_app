"use client";

import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface VisitSectionPanelProps {
  title: string;
  icon: IconSvgElement;
  children: ReactNode;
  className?: string;
}

/**
 * Review-style column with the light-blue `#d2e3fc` section header bar
 * from Angular `review-detail-body`.
 */
export function VisitSectionPanel({
  title,
  icon,
  children,
  className,
}: VisitSectionPanelProps) {
  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-center gap-2 bg-[#d2e3fc] px-3 py-2.5 text-[#1e3a8a] dark:bg-primary/20 dark:text-primary-foreground">
        <HugeiconsIcon icon={icon} className="size-5 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground dark:text-foreground">{title}</h3>
      </div>
      <div className="flex-1 p-3">{children}</div>
    </section>
  );
}
