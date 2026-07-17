"use client";

import { ArrowDown01Icon, ArrowUp01Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

interface PaletteItem {
  id: string;
  label: string;
  subtitle: string;
  custom?: boolean;
}

interface PlannerAddMenuProps {
  /** Button label, e.g. "Add photo". */
  label: string;
  items: PaletteItem[];
  disabled?: boolean;
  onAdd: (id: string) => void;
  onAddCustom?: () => void;
  onRemoveCustom?: (id: string) => void;
}

/**
 * Dropdown to add a photo / question / document from the template library.
 * Custom types can be created and removed from the same menu.
 */
export function PlannerAddMenu({
  label,
  items,
  disabled = false,
  onAdd,
  onAddCustom,
  onRemoveCustom,
}: PlannerAddMenuProps) {
  const builtins = items.filter((item) => !item.custom);
  const customs = items.filter((item) => item.custom);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" disabled={disabled}>
          <HugeiconsIcon icon={PlusSignIcon} className="size-3.5" data-icon="inline-start" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Choose a type</DropdownMenuLabel>
        {builtins.map((item) => (
          <DropdownMenuItem key={item.id} onSelect={() => onAdd(item.id)}>
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{item.label}</span>
              <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
            </span>
          </DropdownMenuItem>
        ))}
        {customs.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Custom types</DropdownMenuLabel>
            {customs.map((item) => (
              <DropdownMenuItem
                key={item.id}
                className="justify-between gap-2"
                onSelect={() => onAdd(item.id)}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{item.label}</span>
                  <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                </span>
                {onRemoveCustom && (
                  <button
                    type="button"
                    className="shrink-0 rounded px-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onRemoveCustom(item.id);
                    }}
                    aria-label={`Remove ${item.label}`}
                  >
                    ×
                  </button>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
        {onAddCustom && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onAddCustom}>Create custom type…</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** @deprecated Use {@link PlannerAddMenu}. Kept for any leftover imports. */
export function PlannerPalettePanel({
  title = "Library",
  items,
  disabled = false,
  onAdd,
  onAddCustom,
  onRemoveCustom,
}: {
  title?: string;
  items: PaletteItem[];
  disabled?: boolean;
  onAdd: (id: string) => void;
  onAddCustom?: () => void;
  onRemoveCustom?: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <PlannerAddMenu
        label="Add"
        items={items}
        disabled={disabled}
        onAdd={onAdd}
        onAddCustom={onAddCustom}
        onRemoveCustom={onRemoveCustom}
      />
    </div>
  );
}

interface RowReorderButtonsProps {
  index: number;
  total: number;
  disabled?: boolean;
  onMove: (from: number, to: number) => void;
}

export function RowReorderButtons({
  index,
  total,
  disabled = false,
  onMove,
}: RowReorderButtonsProps) {
  return (
    <div className="flex gap-1">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        disabled={disabled || index === 0}
        onClick={() => onMove(index, index - 1)}
        aria-label="Move up"
      >
        <HugeiconsIcon icon={ArrowUp01Icon} className="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        disabled={disabled || index >= total - 1}
        onClick={() => onMove(index, index + 1)}
        aria-label="Move down"
      >
        <HugeiconsIcon icon={ArrowDown01Icon} className="size-3.5" />
      </Button>
    </div>
  );
}
