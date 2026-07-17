import type { ReactNode } from "react";

/** Page title block — Angular entity/dashboard header scale (22px / 700). */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-foreground">{title}</h1>
        {description && (
          <p className="text-[13.5px] text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
