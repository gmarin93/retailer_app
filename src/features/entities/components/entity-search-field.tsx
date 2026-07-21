"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import { useEntitySearch } from "../hooks";
import type { ListableEntityLite } from "../schemas";

function useDebouncedValue(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

interface EntitySearchFieldProps {
  route: "stores" | "customers" | "retailers" | "users" | "programs";
  value: ListableEntityLite | null;
  onChange: (value: ListableEntityLite | null) => void;
  formatOption: (item: ListableEntityLite) => string;
  formatSelected: (item: ListableEntityLite) => string;
  /** Richer list row; defaults to `formatOption` text. */
  renderOption?: (item: ListableEntityLite) => ReactNode;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** Extra query params (e.g. `customer__id__in` for programs). */
  extraParams?: Record<string, string | number | undefined>;
  className?: string;
  /** Minimum dropdown width (helps narrow columns show full names). */
  menuMinWidth?: number;
  "aria-label"?: string;
}

/**
 * Debounced v2 entity typeahead (Angular `*SearchFieldV2` twin). Selection is
 * an entity object; clearing the input clears the selection.
 *
 * Results render in a portal so dialog/overflow parents cannot clip the list.
 *
 * Parents should remount via `key={value?.id ?? "empty"}` when the selected
 * entity is replaced from outside so the input text stays in sync.
 */
export function EntitySearchField({
  route,
  value,
  onChange,
  formatOption,
  formatSelected,
  renderOption,
  placeholder = "Search…",
  disabled,
  required,
  extraParams,
  className,
  menuMinWidth = 280,
  "aria-label": ariaLabel,
}: EntitySearchFieldProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [text, setText] = useState(() => (value ? formatSelected(value) : ""));
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const debounced = useDebouncedValue(text, 300);
  const searching = open && (!value || text !== formatSelected(value));
  const query = useEntitySearch(route, debounced, searching, extraParams);
  const results = query.data ?? [];
  const showMenu = open && searching;

  const updateMenuPosition = () => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const preferBelow = spaceBelow >= 180 || spaceBelow >= spaceAbove;
    const available = preferBelow ? spaceBelow : spaceAbove;
    const maxHeight = Math.min(320, Math.max(140, available));
    const width = Math.max(rect.width, menuMinWidth);
    // Keep the menu inside the viewport horizontally.
    const left = Math.min(rect.left, window.innerWidth - width - 8);

    setMenuStyle({
      position: "fixed",
      left: Math.max(8, left),
      width,
      maxHeight,
      zIndex: 80,
      ...(preferBelow
        ? { top: rect.bottom + gap }
        : { bottom: window.innerHeight - rect.top + gap }),
    });
  };

  useLayoutEffect(() => {
    if (!showMenu) return;
    updateMenuPosition();
  }, [showMenu, results.length, text]);

  useEffect(() => {
    if (!showMenu) return;
    function onReposition() {
      updateMenuPosition();
    }
    window.addEventListener("resize", onReposition);
    // Capture scroll from dialog overflow containers too.
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [showMenu]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const menu =
    showMenu && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            style={menuStyle}
            className="overflow-auto rounded-lg border border-border bg-popover py-1 text-sm text-popover-foreground shadow-lg ring-1 ring-black/5"
          >
            {!debounced.trim() && (
              <li className="px-3 py-2.5 text-muted-foreground">
                Type a name or username to search…
              </li>
            )}
            {debounced.trim() && query.isFetching && (
              <li className="px-3 py-2.5 text-muted-foreground">Searching…</li>
            )}
            {debounced.trim() && !query.isFetching && results.length === 0 && (
              <li className="px-3 py-2.5 text-muted-foreground">No matches</li>
            )}
            {results.map((item) => (
              <li key={item.id} role="option" aria-selected={value?.id === item.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none",
                    value?.id === item.id && "bg-primary/10",
                  )}
                  onClick={() => {
                    onChange(item);
                    setText(formatSelected(item));
                    setOpen(false);
                  }}
                >
                  {renderOption ? renderOption(item) : formatOption(item)}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Input
        value={text}
        disabled={disabled}
        required={required && !value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={showMenu}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          setOpen(true);
          if (value && next !== formatSelected(value)) onChange(null);
          if (!next) onChange(null);
        }}
      />
      {menu}
    </div>
  );
}

export function formatUserOption(item: ListableEntityLite): string {
  const name = [item.first_name, item.last_name].filter(Boolean).join(" ").trim();
  return name || item.username || `User #${item.id}`;
}

export function formatUserSelected(item: ListableEntityLite): string {
  return formatUserOption(item);
}

/** Name + username for clearer typeahead rows. */
export function renderUserOption(item: ListableEntityLite): ReactNode {
  const name = formatUserOption(item);
  const username = item.username?.trim();
  return (
    <>
      <span className="font-medium text-foreground">{name}</span>
      {username && username !== name ? (
        <span className="text-xs text-muted-foreground">@{username}</span>
      ) : (
        <span className="text-xs text-muted-foreground">User #{item.id}</span>
      )}
    </>
  );
}

export function formatCustomerOption(item: ListableEntityLite): string {
  return `${item.title ?? "?"} (${item.code ?? item.id})`;
}

export function formatCustomerSelected(item: ListableEntityLite): string {
  return String(item.code ?? item.title ?? item.id);
}

export function formatRetailerOption(item: ListableEntityLite): string {
  return formatCustomerOption(item);
}

export function formatRetailerSelected(item: ListableEntityLite): string {
  return formatCustomerSelected(item);
}

export function formatStoreOption(item: ListableEntityLite): string {
  const retailer = item.retailer?.title ?? "?";
  return `${retailer} #${item.store_no ?? "?"} — ${item.title ?? "?"} (${item.code ?? item.id})`;
}

export function formatStoreSelected(item: ListableEntityLite): string {
  return `#${item.store_no ?? "?"} ${item.code ?? item.id}`;
}

export function formatProgramOption(item: ListableEntityLite): string {
  const customer = item.customer?.title ?? "?";
  return `${customer}: ${item.title ?? "?"} (${item.code ?? item.id})`;
}

export function formatProgramSelected(item: ListableEntityLite): string {
  return String(item.code ?? item.title ?? item.id);
}
